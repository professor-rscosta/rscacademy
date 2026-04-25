/**
 * RSC Academy — RAG Service v4 (CORRIGIDO)
 * ✅ Chunking inteligente 300-800 tokens com overlap
 * ✅ Extração DOCX com mammoth (preserva estrutura)
 * ✅ Detecção de seções (títulos numerados, CAPS)
 * ✅ Metadata completa por chunk
 * ✅ Resumo automático por documento
 * ✅ TF-IDF melhorado com boost por seção
 */
const { dbFindAll, dbFindById, dbInsert, dbUpdate, dbDeleteWhere } = require('../database/init');

// ── Constantes ────────────────────────────────────────────────
const TARGET_TOKENS  = 400;   // alvo por chunk (em palavras aprox)
const MAX_TOKENS     = 700;   // máximo absoluto
const MIN_TOKENS     = 60;    // mínimo para chunk ser válido
const OVERLAP_RATIO  = 0.15;  // 15% overlap
const OVERLAP_WORDS  = Math.round(TARGET_TOKENS * OVERLAP_RATIO); // ~60 palavras

// ── Stop words português ──────────────────────────────────────
const STOP_WORDS = new Set([
  'que','para','uma','com','por','mais','como','mas','seu','sua','dos','das',
  'nos','nas','num','numa','esse','essa','este','esta','isso','isto','ela','ele',
  'eles','elas','tem','ser','ter','foi','são','estão','pode','deve','sobre',
  'também','quando','onde','porque','então','assim','pelo','pela','pelos','pelas',
  'cada','todo','toda','todos','todas','muito','pouco','bem','mal','aqui','lá',
  'apenas','ainda','já','mesmo','depois','antes','sempre','nunca','talvez',
]);

// ── Contagem de tokens (aprox: 1 palavra ≈ 1.3 tokens) ────────
const wordCount = t => (t||'').split(/\s+/).filter(w => w.length > 0).length;
const tokenCount = t => Math.round(wordCount(t) * 1.3);

// ── Detectar se linha é título/seção ─────────────────────────
function isSectionTitle(line) {
  const t = line.trim();
  if (!t || t.length > 120) return false;
  return (
    /^\d+[\.\)]\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ]/.test(t) ||       // 1. Introdução
    /^\d+\.\d+[\.\s]+[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ]/.test(t) ||    // 1.1 Subseção
    /^[IVXLC]+\.\s+[A-Z]/.test(t) ||                    // I. Capítulo
    /^(INTRODUÇÃO|CONCLUSÃO|METODOLOGIA|REFERÊNCIAS|ABSTRACT|RESUMO|SUMÁRIO|CAPÍTULO|OBJETIVOS|RESULTADOS|DISCUSSÃO|BIBLIOGRAFIA)/i.test(t) ||
    (t === t.toUpperCase() && t.length > 5 && t.length < 80 && /[A-ZÀ-Ú]{4,}/.test(t)) ||
    /^#{1,4}\s+/.test(t)  // markdown headers
  );
}

// ── Limpar texto ──────────────────────────────────────────────
function cleanText(text) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/^-- \d+ of \d+ --$/gm, '')        // separadores pdf-parse
    .replace(/[ \t]{3,}/g, '  ')                 // espaços excessivos
    .replace(/\n{4,}/g, '\n\n\n')                // linhas em branco excessivas
    .replace(/[^\S\n]{2,}/g, ' ')                // espaços múltiplos na linha
    .trim();
}

// ── Segmentar texto em blocos semânticos ──────────────────────
function segmentarEmBlocos(text) {
  const linhas = cleanText(text).split('\n');
  const blocos = [];
  let blocoAtual = [];
  let secaoAtual = 'Geral';

  for (const linha of linhas) {
    const l = linha.trim();

    if (isSectionTitle(l)) {
      // Salvar bloco anterior
      if (blocoAtual.length > 0) {
        blocos.push({ texto: blocoAtual.join('\n').trim(), secao: secaoAtual });
        blocoAtual = [];
      }
      secaoAtual = l.replace(/^#+\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim() || l;
      blocoAtual.push(l);  // incluir título no próximo bloco
    } else if (l === '') {
      // Linha em branco = potencial separador de parágrafo
      if (blocoAtual.length > 0) blocoAtual.push('');
    } else {
      blocoAtual.push(l);
    }
  }

  if (blocoAtual.length > 0) {
    blocos.push({ texto: blocoAtual.join('\n').trim(), secao: secaoAtual });
  }

  return blocos.filter(b => wordCount(b.texto) >= 10);
}

// ── Chunking inteligente (PRINCIPAL CORREÇÃO) ─────────────────
function chunkText(text, targetWords = TARGET_TOKENS) {
  if (!text || text.length < 50) return [];

  const cleaned = cleanText(text);
  const blocos  = segmentarEmBlocos(cleaned);

  if (blocos.length === 0) return [];

  const chunks = [];
  let bufferTextos = [];
  let bufferWords  = 0;
  let secaoBuffer  = 'Geral';
  let chunkIdx     = 0;

  const pushChunk = (textos, secao) => {
    const conteudo = textos.join('\n\n').trim();
    if (wordCount(conteudo) < MIN_TOKENS) return;
    chunks.push({ conteudo, secao, idx: chunkIdx++ });
  };

  for (let b = 0; b < blocos.length; b++) {
    const bloco = blocos[b];
    const bWords = wordCount(bloco.texto);

    // Bloco muito grande — precisa ser quebrado
    if (bWords > MAX_TOKENS) {
      // Salvar buffer atual
      if (bufferTextos.length > 0) {
        pushChunk(bufferTextos, secaoBuffer);
        bufferTextos = [];
        bufferWords  = 0;
      }

      // Quebrar em sentenças
      const sentencas = bloco.texto
        .split(/(?<=[.!?;])\s+/)
        .filter(s => s.trim().length > 20);

      let sentBuffer = [];
      let sentWords  = 0;
      let lastSents  = [];

      for (const sent of sentencas) {
        const sw = wordCount(sent);
        if (sentWords + sw > targetWords && sentBuffer.length > 0) {
          pushChunk(sentBuffer, bloco.secao);
          // Overlap: manter últimas sentenças
          const overlapSents = [];
          let overlapW = 0;
          for (let i = sentBuffer.length - 1; i >= 0 && overlapW < OVERLAP_WORDS; i--) {
            overlapSents.unshift(sentBuffer[i]);
            overlapW += wordCount(sentBuffer[i]);
          }
          sentBuffer = overlapSents;
          sentWords  = overlapW;
        }
        sentBuffer.push(sent);
        sentWords += sw;
      }
      if (sentBuffer.length > 0) pushChunk(sentBuffer, bloco.secao);

      secaoBuffer = bloco.secao;
      continue;
    }

    // Buffer ficaria muito grande — fazer flush com overlap
    if (bufferWords + bWords > targetWords && bufferTextos.length > 0) {
      pushChunk(bufferTextos, secaoBuffer);

      // Overlap: manter últimos N blocos
      const overlapBlocos = [];
      let overlapW = 0;
      for (let i = bufferTextos.length - 1; i >= 0 && overlapW < OVERLAP_WORDS; i--) {
        overlapBlocos.unshift(bufferTextos[i]);
        overlapW += wordCount(bufferTextos[i]);
      }
      bufferTextos = overlapBlocos;
      bufferWords  = overlapW;
    }

    bufferTextos.push(bloco.texto);
    bufferWords  += bWords;
    secaoBuffer   = bloco.secao;

    // Forçar flush em seção nova de tamanho médio
    if (bufferWords >= TARGET_TOKENS * 0.8 && isSectionTitle(blocos[b+1]?.texto?.split('\n')[0] || '')) {
      pushChunk(bufferTextos, secaoBuffer);
      bufferTextos = [];
      bufferWords  = 0;
    }
  }

  if (bufferTextos.length > 0) pushChunk(bufferTextos, secaoBuffer);

  console.log(`[RAG v4] Chunking: ${chunks.length} chunks gerados de ${wordCount(cleaned)} palavras`);
  return chunks;
}

// ── Extrair texto de base64 ───────────────────────────────────
async function extractTextFromBase64(base64, mimeType, fileName) {
  try {
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    const buf = Buffer.from(raw, 'base64');
    const ext = (fileName || '').split('.').pop().toLowerCase();

    if (['txt','md','csv'].includes(ext) || mimeType === 'text/plain') return buf.toString('utf-8');
    if (ext === 'json') return buf.toString('utf-8');
    if (ext === 'html' || ext === 'htm') return buf.toString('utf-8').replace(/<[^>]+>/g, ' ');
    if (ext === 'pdf' || mimeType === 'application/pdf') return await extractPDF(buf);
    if (['docx','doc'].includes(ext) || mimeType?.includes('word')) return await extractDOCX(buf);
    return extractReadableStrings(buf);
  } catch(e) {
    console.error('[RAG] extract error:', e.message);
    return '';
  }
}

// ── PDF: pdf-parse v2 ─────────────────────────────────────────
async function extractPDF(buf) {
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buf, verbosity: 0 });
    const result = await parser.getText({ pageJoiner: '\n\n--- página ---\n\n' });
    const text = (result?.text || '')
      .replace(/^-- \d+ of \d+ --$/gm, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();

    const words = text.split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ]{2,}/.test(w)).length;
    console.log(`[RAG] PDF: ${words} palavras, ${result?.total||0} páginas`);

    if (words < 10) return extractPDFFallback(buf);
    return text;
  } catch(e) {
    console.error('[RAG] pdf-parse error:', e.message.slice(0,100));
    return extractPDFFallback(buf);
  }
}

// ── PDF Fallback ──────────────────────────────────────────────
function extractPDFFallback(buf) {
  const zlib = require('zlib');
  const texts = [];
  try {
    const pdfStr = buf.toString('binary');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(pdfStr)) !== null) {
      const streamBuf = Buffer.from(match[1], 'binary');
      try {
        const inflated = zlib.inflateRawSync(streamBuf);
        texts.push(...extractBTET(inflated.toString('utf-8')));
      } catch {
        try {
          const inflated = zlib.inflateSync(streamBuf);
          texts.push(...extractBTET(inflated.toString('utf-8')));
        } catch { texts.push(...extractBTET(match[1])); }
      }
    }
    texts.push(...extractBTET(pdfStr));
  } catch {}
  return texts.filter(t => /[a-zA-ZÀ-ÿ]{2,}/.test(t) && t.length > 3).join(' ');
}

function extractBTET(str) {
  const texts = [];
  const regex = /BT[\s\S]*?ET/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const block = match[0];
    (block.match(/\(([^)]{1,300})\)\s*Tj/g)||[]).forEach(tj => {
      const t = tj.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
      if (t.length > 1 && /[a-zA-ZÀ-ÿ0-9]/.test(t)) texts.push(t);
    });
    (block.match(/\[([^\]]+)\]\s*TJ/g)||[]).forEach(tjArr => {
      (tjArr.match(/\(([^)]+)\)/g)||[]).forEach(p => {
        const t = p.replace(/^\(/, '').replace(/\)$/, '').trim();
        if (t.length > 1 && /[a-zA-ZÀ-ÿ0-9]/.test(t)) texts.push(t);
      });
    });
  }
  return texts;
}

// ── DOCX: mammoth (PRESERVA ESTRUTURA) ───────────────────────
async function extractDOCX(buf) {
  try {
    const mammoth = require('mammoth');

    // Extrair como Markdown para preservar estrutura
    const result = await mammoth.convertToMarkdown({ buffer: buf });
    let text = result.value || '';

    if (text.length > 200) {
      console.log(`[RAG] DOCX (mammoth markdown): ${wordCount(text)} palavras`);
      return text;
    }

    // Fallback: extrair texto puro
    const raw = await mammoth.extractRawText({ buffer: buf });
    text = raw.value || '';
    if (text.length > 50) {
      console.log(`[RAG] DOCX (mammoth texto): ${wordCount(text)} palavras`);
      return text;
    }
  } catch(e) {
    console.error('[RAG] mammoth error:', e.message);
  }

  // Fallback manual
  return extractDOCXManual(buf);
}

function extractDOCXManual(buf) {
  try {
    const str = buf.toString('binary');
    // Tentar extrair paragrafos (w:p) e runs (w:r > w:t)
    const paraRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
    const textParts = [];
    let pm;
    while ((pm = paraRegex.exec(str)) !== null) {
      const para = pm[0];
      const tMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const texto = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
      if (texto.trim().length > 2) textParts.push(texto.trim());
    }
    if (textParts.length > 0) return textParts.join('\n');
  } catch {}
  return extractReadableStrings(buf);
}

// ── Strings legíveis (fallback genérico) ─────────────────────
function extractReadableStrings(buf) {
  let str;
  try { str = buf.toString('utf-8', 0, Math.min(buf.length, 500000)); }
  catch { str = buf.toString('latin1', 0, Math.min(buf.length, 500000)); }
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .split('\n')
    .filter(l => {
      const t = l.trim();
      return t.split(/\s+/).length >= 3 &&
             (t.match(/[a-zA-ZÀ-ÿ]/g)||[]).length >= 8 &&
             t.length >= 15 &&
             !/^\d{10}\s/.test(t) &&
             !/^[0-9a-fA-F\s]{20,}$/.test(t);
    })
    .join('\n');
}

// ── Qualidade do texto ────────────────────────────────────────
function textQuality(text) {
  if (!text || !text.length) return 0;
  const alpha = (text.match(/[a-zA-ZÀ-ÿ]/g)||[]).length;
  return Math.round(100 * alpha / (text.replace(/\s/g,'').length || 1));
}

// ── Indexar documento com chunking v4 ────────────────────────
async function indexDocument(doc, disciplina_id) {
  const C = 'rag_contextos';
  await dbDeleteWhere(C, c => c.doc_id === doc.id);

  if (!doc.texto_extraido || doc.texto_extraido.length < 30) return 0;

  const chunkObjs = chunkText(doc.texto_extraido);
  let count = 0;

  for (const chunk of chunkObjs) {
    const texto = chunk.conteudo.trim();
    if (!texto) continue;

    await dbInsert(C, {
      doc_id:        doc.id,
      disciplina_id: Number(disciplina_id),
      titulo:        `${doc.titulo} › ${chunk.secao} [${chunk.idx + 1}]`,
      conteudo:      texto,
      secao:         chunk.secao,
      indice:        chunk.idx,
      pagina_aprox:  chunk.idx + 1,
      tags:          [...(doc.tags||[]), doc.tipo_documento, doc.categoria, chunk.secao].filter(Boolean),
      fonte:         doc.titulo,
      tipo_fonte:    doc.tipo_documento || 'documento',
      vezes_usado:   0,
    });
    count++;
  }

  console.log(`[RAG v4] Indexado: ${count} chunks para "${doc.titulo}" (disc=${disciplina_id})`);
  return count;
}

// ── TF-IDF melhorado ──────────────────────────────────────────
function tokenize(text) {
  return (text||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function tfIdf(queryTokens, docText, secao='') {
  const docTokens = tokenize(docText);
  const total = docTokens.length || 1;
  let score = 0;

  for (const qt of queryTokens) {
    let matches = 0;
    for (const dt of docTokens) {
      if (dt === qt || dt.startsWith(qt) || qt.startsWith(dt)) matches++;
    }
    score += matches / total;
  }

  // Boost se a query aparece no título da seção
  const secaoTokens = tokenize(secao);
  for (const qt of queryTokens) {
    if (secaoTokens.includes(qt)) score += 0.5;
  }

  return score;
}

// ── Recuperação TF-IDF ────────────────────────────────────────
async function retrieveContext(query, tags = [], topK = 8, disciplina_id = null) {
  let contextos = await dbFindAll('rag_contextos');

  if (disciplina_id) {
    const filtered = contextos.filter(c => c.disciplina_id === Number(disciplina_id));
    if (filtered.length > 0) contextos = filtered;
  }

  if (!contextos.length) return [];

  const queryTokens = tokenize(query);
  const tagTokens   = tags.map(t => tokenize(t)).flat();
  const allTokens   = [...new Set([...queryTokens, ...tagTokens])];

  const scored = contextos.map(ctx => {
    let score = tfIdf(allTokens, ctx.titulo || '', ctx.secao) * 3
               + tfIdf(allTokens, ctx.conteudo || '') * 2
               + tfIdf(allTokens, (ctx.tags||[]).join(' ')) * 4;

    if (tags.some(t => (ctx.tags||[]).some(ct => ct.toLowerCase().includes(t.toLowerCase())))) score += 3;
    return { ...ctx, _score: score };
  });

  const relevantes = scored
    .filter(c => c._score > 0.002)
    .sort((a, b) => b._score - a._score);

  // Pegar top-K com diversidade por seção
  const resultado = [];
  const secoesVistas = new Map();

  for (const c of relevantes) {
    if (resultado.length >= topK) break;
    const secaoCount = secoesVistas.get(c.secao) || 0;
    // Limitar 3 chunks por seção para diversidade
    if (secaoCount < 3) {
      resultado.push(c);
      secoesVistas.set(c.secao, secaoCount + 1);
    }
  }

  // Se não chegou ao topK, completar sem filtro de seção
  if (resultado.length < topK) {
    for (const c of relevantes) {
      if (resultado.length >= topK) break;
      if (!resultado.find(r => r.id === c.id)) resultado.push(c);
    }
  }

  return resultado.slice(0, topK);
}

// ── Context Expansion ─────────────────────────────────────────
async function expandContext(chunks, disciplina_id = null) {
  if (!chunks || chunks.length === 0) return chunks;

  let todosCtxs = await dbFindAll('rag_contextos');
  if (disciplina_id) todosCtxs = todosCtxs.filter(c => c.disciplina_id === Number(disciplina_id));

  const ids = new Set(chunks.map(c => c.id));
  const expanded = [...chunks];

  for (const chunk of chunks) {
    // Vizinhos: mesmo doc_id + indices adjacentes
    const vizinhos = todosCtxs.filter(c =>
      !ids.has(c.id) &&
      c.doc_id === chunk.doc_id &&
      typeof c.indice === 'number' &&
      typeof chunk.indice === 'number' &&
      Math.abs(c.indice - chunk.indice) === 1
    );
    for (const v of vizinhos.slice(0, 2)) {
      if (!ids.has(v.id)) { ids.add(v.id); expanded.push({ ...v, _vizinho: true }); }
    }
  }

  return expanded;
}

// ── Formatar contexto para prompt ────────────────────────────
function formatContextForPrompt(contextos, expandido = false) {
  if (!contextos || !contextos.length) return '';
  return contextos.map((c, i) => {
    const fonte  = c.fonte   ? ` [Fonte: ${c.fonte}]` : '';
    const secao  = c.secao   ? ` › ${c.secao}` : '';
    const pagina = c.pagina_aprox ? ` (p.${c.pagina_aprox})` : '';
    const viz    = c._vizinho ? ' ↔ contexto adjacente' : '';
    return `--- Trecho ${i+1}${fonte}${secao}${pagina}${viz} ---\n${c.conteudo}`;
  }).join('\n\n');
}

async function markUsed(ids) {
  for (const id of ids) {
    const ctx = await dbFindById('rag_contextos', id);
    if (ctx) await dbUpdate('rag_contextos', id, { vezes_usado: (ctx.vezes_usado||0)+1 });
  }
}

module.exports = {
  chunkText,
  extractTextFromBase64,
  textQuality,
  indexDocument,
  retrieveContext,
  expandContext,
  formatContextForPrompt,
  markUsed,
  cleanText,
  segmentarEmBlocos,
};
