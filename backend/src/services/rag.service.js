/**
 * RSC Academy — RAG Service v3
 * Extração de texto usando pdf-parse v2 (API correta)
 * Funciona como NotebookLM: lê o texto real do PDF
 */
const { dbFindAll, dbInsert, dbUpdate, dbDeleteWhere } = require('../database/init');

// ── Stop words português ──────────────────────────────────────
const STOP_WORDS = new Set([
  'que','para','uma','com','por','mais','como','mas','seu','sua','dos','das',
  'nos','nas','num','numa','esse','essa','este','esta','isso','isto','ela','ele',
  'eles','elas','tem','ser','ter','foi','são','estão','pode','deve','sobre','também',
  'quando','onde','porque','então','assim','pelo','pela','pelos','pelas','entre',
  'cada','todo','toda','todos','todas','muito','pouco','bem','mal','aqui','lá',
  'apenas','ainda','já','mesmo','depois','antes','sempre','nunca','talvez',
]);

function tokenize(text) {
  return (text||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function tfIdf(queryTokens, docText) {
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
  return score;
}

// ── Chunking semântico ────────────────────────────────────────
function chunkText(text, targetWords = 250, overlap = 40) {
  const cleaned = (text||'')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    // Remover linhas de cabeçalho/rodapé repetidas (ex: números de página)
    .replace(/^-- \d+ of \d+ --$/gm, '')
    .trim();

  if (!cleaned || cleaned.length < 30) return [];

  const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length === 0) {
    const words = cleaned.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += targetWords - overlap) {
      const chunk = words.slice(i, i + targetWords).join(' ');
      if (chunk.length > 50) chunks.push(chunk);
    }
    return chunks;
  }

  const chunks = [];
  let current = [];
  let wordCount = 0;
  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;
    if (wordCount + paraWords > targetWords && current.length > 0) {
      chunks.push(current.join('\n\n'));
      const last = current[current.length - 1];
      current = last ? [last] : [];
      wordCount = last ? last.split(/\s+/).length : 0;
    }
    current.push(para);
    wordCount += paraWords;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks.filter(c => c.trim().length > 50);
}

// ── Extração de texto principal ────────────────────────────────
async function extractTextFromBase64(base64, mimeType, fileName) {
  try {
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    const buf = Buffer.from(raw, 'base64');
    const ext = (fileName||'').split('.').pop().toLowerCase();

    // ── Texto puro ─────────────────────────────────────────────
    if (['txt','md','csv','html','htm'].includes(ext) || mimeType === 'text/plain') {
      return buf.toString('utf-8');
    }
    if (ext === 'json') return buf.toString('utf-8');

    // ── PDF — usa pdf-parse v2 ─────────────────────────────────
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      return await extractPDF(buf);
    }

    // ── DOCX ───────────────────────────────────────────────────
    if (['docx','doc'].includes(ext) || mimeType?.includes('word')) {
      return extractDOCX(buf);
    }

    // ── Fallback genérico ──────────────────────────────────────
    return extractReadableStrings(buf);

  } catch(e) {
    console.error('[RAG] extract error:', e.message);
    return '';
  }
}

// ── PDF: usa pdf-parse v2 corretamente ────────────────────────
async function extractPDF(buf) {
  try {
    const { PDFParse } = require('pdf-parse');
    
    // API correta do pdf-parse v2: passa data no construtor
    const parser = new PDFParse({
      data: buf,
      verbosity: 0,   // sem logs
    });

    const result = await parser.getText({
      // Sem pageJoiner para texto limpo
      pageJoiner: '\n\n--- página ---\n\n',
      lineEnforce: true,
      cellSeparator: '\t',
    });

    const rawText = result?.text || '';
    
    // Limpar artefatos do pdf-parse
    const text = rawText
      .replace(/^-- \d+ of \d+ --$/gm, '')   // separadores de página
      .replace(/\n{4,}/g, '\n\n')              // múltiplas linhas em branco
      .trim();

    const wordCount = text.split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ]{2,}/.test(w)).length;
    const charCount = text.length;

    console.log(`[RAG] pdf-parse v2: ${wordCount} palavras, ${charCount} chars, ${result?.total || 0} páginas`);

    if (wordCount < 10) {
      console.log('[RAG] pdf-parse v2 retornou pouco texto, tentando fallback manual...');
      return extractPDFFallback(buf);
    }

    return text;

  } catch(e) {
    console.error('[RAG] pdf-parse v2 error:', e.message.slice(0, 120));
    return extractPDFFallback(buf);
  }
}

// ── Fallback manual para PDFs problemáticos ────────────────────
function extractPDFFallback(buf) {
  const zlib = require('zlib');
  const texts = [];

  try {
    const pdfStr = buf.toString('binary');

    // Descomprimir streams FlateDecode
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(pdfStr)) !== null) {
      const streamBuf = Buffer.from(match[1], 'binary');
      try {
        const inflated = zlib.inflateRawSync(streamBuf);
        const txt = inflated.toString('utf-8');
        texts.push(...extractBTET(txt));
      } catch(e1) {
        try {
          const inflated = zlib.inflateSync(streamBuf);
          const txt = inflated.toString('utf-8');
          texts.push(...extractBTET(txt));
        } catch(e2) {
          texts.push(...extractBTET(match[1]));
        }
      }
    }

    texts.push(...extractBTET(pdfStr));

  } catch(e) {
    console.error('[RAG] fallback error:', e.message);
  }

  return texts
    .filter(t => /[a-zA-ZÀ-ÿ]{2,}/.test(t) && t.length > 3)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractBTET(str) {
  const texts = [];
  const regex = /BT[\s\S]*?ET/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const block = match[0];
    const tjMatches = block.match(/\(([^)]{1,300})\)\s*Tj/g) || [];
    tjMatches.forEach(tj => {
      const t = tj.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
      if (t.length > 1 && /[a-zA-ZÀ-ÿ0-9]/.test(t)) texts.push(t);
    });
    const tjArrMatches = block.match(/\[([^\]]+)\]\s*TJ/g) || [];
    tjArrMatches.forEach(tjArr => {
      const parts = tjArr.match(/\(([^)]+)\)/g) || [];
      parts.forEach(p => {
        const t = p.replace(/^\(/, '').replace(/\)$/, '').trim();
        if (t.length > 1 && /[a-zA-ZÀ-ÿ0-9]/.test(t)) texts.push(t);
      });
    });
  }
  return texts;
}

function extractDOCX(buf) {
  try {
    const str = buf.toString('binary');
    const xmlMatches = str.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const text = xmlMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    if (text.length > 50) return text;
  } catch(e) {}
  return extractReadableStrings(buf);
}

function extractReadableStrings(buf) {
  let str;
  try { str = buf.toString('utf-8', 0, Math.min(buf.length, 500000)); }
  catch(e) { str = buf.toString('latin1', 0, Math.min(buf.length, 500000)); }

  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .split('\n')
    .filter(l => {
      const t = l.trim();
      const words = t.split(/\s+/).length;
      const alphaCount = (t.match(/[a-zA-ZÀ-ÿ]/g)||[]).length;
      const isXref = /\d{10} \d{5} [fn]/.test(t);
      const isHex  = /^[0-9a-fA-F\s]+$/.test(t) && t.length > 20;
      return words >= 3 && alphaCount >= 8 && t.length >= 15 && !isXref && !isHex;
    })
    .join('\n');
}

// ── Indexar documento (criar chunks no banco) ─────────────────
async function indexDocument(doc, disciplina_id) {
  const C = 'rag_contextos';

  // Remover chunks antigos deste documento
  dbDeleteWhere(C, c => c.doc_id === doc.id);

  if (!doc.texto_extraido || doc.texto_extraido.length < 30) return 0;

  const chunks = chunkText(doc.texto_extraido);
  let count = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;
    dbInsert(C, {
      doc_id:        doc.id,
      disciplina_id: Number(disciplina_id),
      titulo:        `${doc.titulo} [parte ${i+1}/${chunks.length}]`,
      conteudo:      chunk,
      tags:          [...(doc.tags||[]), doc.tipo_documento, doc.categoria].filter(Boolean),
      fonte:         doc.titulo,
      tipo_fonte:    doc.tipo_documento || 'documento',
      pagina_aprox:  i + 1,
    });
    count++;
  }
  return count;
}

// ── Recuperação TF-IDF ────────────────────────────────────────
function retrieveContext(query, tags = [], topK = 5, disciplina_id = null) {
  let contextos = dbFindAll('rag_contextos');
  if (disciplina_id) {
    const filtered = contextos.filter(c => c.disciplina_id === Number(disciplina_id));
    if (filtered.length > 0) contextos = filtered;
  }
  if (!contextos.length) return [];

  const queryTokens = tokenize(query);
  const tagTokens   = tags.map(t => tokenize(t)).flat();
  const allTokens   = [...new Set([...queryTokens, ...tagTokens])];

  return contextos
    .map(ctx => {
      let score = tfIdf(allTokens, ctx.titulo||'') * 3
                + tfIdf(allTokens, ctx.conteudo||'') * 2
                + tfIdf(allTokens, (ctx.tags||[]).join(' ')) * 4;
      if (tags.some(t => (ctx.tags||[]).some(ct => ct.toLowerCase().includes(t.toLowerCase())))) score += 3;
      return { ...ctx, _score: score };
    })
    .filter(c => c._score > 0.005)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK);
}

function formatContextForPrompt(contextos) {
  if (!contextos || !contextos.length) return '';
  return contextos.map((c, i) => {
    const fonte = c.fonte ? ` [Fonte: ${c.fonte}]` : '';
    const tipo  = c.tipo_fonte ? ` (${c.tipo_fonte})` : '';
    return `--- Contexto ${i+1}${fonte}${tipo} ---\n${c.conteudo}`;
  }).join('\n\n');
}

function markUsed(ids) {
  for (const id of ids) {
    const ctx = dbFindAll('rag_contextos').find(c => c.id === id);
    if (ctx) dbUpdate('rag_contextos', id, { vezes_usado: (ctx.vezes_usado||0)+1 });
  }
}

// ── Calcular qualidade do texto extraído (% de chars alfa) ───
function textQuality(text) {
  if (!text || text.length === 0) return 0;
  const alpha = (text.match(/[a-zA-ZÀ-ÿ]/g)||[]).length;
  const total = text.replace(/\s/g,'').length || 1;
  return Math.round(100 * alpha / total);
}

module.exports = {
  chunkText,
  extractTextFromBase64,
  textQuality,
  indexDocument,
  retrieveContext,
  formatContextForPrompt,
  markUsed,
};
