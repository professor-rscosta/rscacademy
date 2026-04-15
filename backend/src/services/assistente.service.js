/**
 * RSC Academy — Assistente Virtual Avançado v2
 * RAG com embeddings OpenAI + memória de sessão + context expansion
 */

const { dbFindAll, dbUpdate, dbInsert } = require('../database/init');

// ── Memória de sessão (in-memory por usuário) ──────────────────
const sessoes = new Map(); // userId -> { historico, resumo, ultimaAtividade }
const MAX_HISTORICO = 20;
const TIMEOUT_SESSAO = 30 * 60 * 1000; // 30 min

function getSession(userId) {
  const agora = Date.now();
  let s = sessoes.get(userId);
  if (!s || agora - s.ultimaAtividade > TIMEOUT_SESSAO) {
    s = { historico: [], resumo: '', ultimaAtividade: agora };
    sessoes.set(userId, s);
  }
  s.ultimaAtividade = agora;
  return s;
}

function addToSession(userId, role, content) {
  const s = getSession(userId);
  s.historico.push({ role, content, ts: Date.now() });
  if (s.historico.length > MAX_HISTORICO) s.historico.shift();
}

function clearSession(userId) {
  sessoes.delete(userId);
}

// ── Embeddings OpenAI ──────────────────────────────────────────
async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sua_chave_aqui') throw new Error('OPENAI_API_KEY não configurada.');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Embedding error: ' + (err.error?.message || res.statusText));
  }
  const data = await res.json();
  return data.data[0].embedding;
}

// ── Cosine Similarity (pure JS) ────────────────────────────────
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// ── MMR (Maximal Marginal Relevance) ──────────────────────────
function mmrRerank(docs, queryEmbed, lambda = 0.7, topK = 6) {
  if (docs.length <= topK) return docs;
  const selected = [];
  const remaining = [...docs];
  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0, bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const relevance = cosineSimilarity(remaining[i]._embed, queryEmbed);
      let maxSim = 0;
      for (const s of selected) {
        const sim = cosineSimilarity(remaining[i]._embed, s._embed);
        if (sim > maxSim) maxSim = sim;
      }
      const score = lambda * relevance - (1 - lambda) * maxSim;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  return selected;
}

// ── Indexar chunk com embedding ────────────────────────────────
async function indexarChunkComEmbedding(chunkId, texto) {
  try {
    const embed = await getEmbedding(texto);
    dbUpdate('rag_contextos', chunkId, { embedding: embed });
    return embed;
  } catch(e) {
    console.error('[Assistente] Embedding falhou para chunk', chunkId, e.message);
    return null;
  }
}

// ── Indexar todos os chunks sem embedding ──────────────────────
async function indexarPendentes(disciplinaId = null) {
  let contextos = dbFindAll('rag_contextos');
  if (disciplinaId) contextos = contextos.filter(c => c.disciplina_id === Number(disciplinaId));
  const pendentes = contextos.filter(c => !c.embedding);
  let count = 0;
  for (const c of pendentes) {
    await indexarChunkComEmbedding(c.id, c.conteudo);
    count++;
    // Pequena pausa para não estourar rate limit
    if (count % 10 === 0) await new Promise(r => setTimeout(r, 500));
  }
  return count;
}

// ── Busca vetorial principal ────────────────────────────────────
async function buscarContextos(pergunta, disciplinaId = null, topK = 8) {
  const queryEmbed = await getEmbedding(pergunta);

  let contextos = dbFindAll('rag_contextos');
  if (disciplinaId) {
    const filtered = contextos.filter(c => c.disciplina_id === Number(disciplinaId));
    if (filtered.length > 0) contextos = filtered;
  }

  // Filtrar só os que têm embedding
  const comEmbed = contextos.filter(c => c.embedding && c.embedding.length > 0);

  if (comEmbed.length === 0) {
    // Fallback para TF-IDF se não há embeddings
    return buscarTFIDF(pergunta, disciplinaId, topK);
  }

  // Calcular similaridade
  const scored = comEmbed.map(c => ({
    ...c,
    _embed: c.embedding,
    _score: cosineSimilarity(c.embedding, queryEmbed),
  })).sort((a, b) => b._score - a._score);

  // MMR para diversidade
  const topCandidatos = scored.slice(0, Math.min(20, scored.length));
  const selecionados  = mmrRerank(topCandidatos, queryEmbed, 0.7, topK);

  // Context expansion usando ragSvc
  const ragSvc = require('./rag.service');
  const resultado = ragSvc.expandContext(selecionados, disciplinaId);

  return { chunks: resultado, queryEmbed, usouEmbeddings: true };
}

// ── Context Expansion: incluir chunks adjacentes ───────────────
function expandirContexto(selecionados, todosChunks) {
  const ids = new Set(selecionados.map(c => c.id));
  const expanded = [...selecionados];

  for (const chunk of selecionados) {
    // Encontrar chunks do mesmo documento com pagina_aprox próxima
    const vizinhos = todosChunks.filter(c =>
      !ids.has(c.id) &&
      c.doc_id === chunk.doc_id &&
      c.pagina_aprox &&
      chunk.pagina_aprox &&
      Math.abs(c.pagina_aprox - chunk.pagina_aprox) <= 1
    );
    for (const v of vizinhos) {
      if (!ids.has(v.id)) {
        ids.add(v.id);
        expanded.push({ ...v, _vizinho: true });
      }
    }
  }

  return expanded.sort((a, b) => (b._score||0) - (a._score||0));
}

// ── Fallback TF-IDF ────────────────────────────────────────────
function buscarTFIDF(pergunta, disciplinaId, topK) {
  const ragSvc = require('./rag.service');
  const chunks = ragSvc.retrieveContext(pergunta, [], topK, disciplinaId ? Number(disciplinaId) : null);
  return { chunks, queryEmbed: null, usouEmbeddings: false };
}

// ── Formatar contexto para prompt ──────────────────────────────
function formatarContexto(chunks) {
  if (!chunks || chunks.length === 0) return '';
  return chunks.map((c, i) => {
    const fonte = c.fonte ? ` [Fonte: ${c.fonte}]` : '';
    const vizinho = c._vizinho ? ' (contexto expandido)' : '';
    const score = c._score ? ` (relevância: ${(c._score * 100).toFixed(0)}%)` : '';
    return `--- Trecho ${i+1}${fonte}${vizinho}${score} ---\n${c.conteudo}`;
  }).join('\n\n');
}

// ── Gerar resumo do documento ──────────────────────────────────
async function gerarResumoDocumento(docId, textoExtraido) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return '';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          { role: 'system', content: 'Você faz resumos concisos de documentos acadêmicos. Máximo 5 frases.' },
          { role: 'user', content: 'Resuma este documento:\n\n' + textoExtraido.slice(0, 4000) },
        ],
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch(e) { return ''; }
}

// ── Chat principal com RAG avançado ────────────────────────────
async function chat({ userId, mensagem, disciplinaId, modoFileSear = false }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sua_chave_aqui') throw new Error('OPENAI_API_KEY não configurada.');

  const sessao = getSession(userId);
  addToSession(userId, 'user', mensagem);

  // Busca vetorial
  let resultado;
  try {
    resultado = await buscarContextos(mensagem, disciplinaId, 8);
  } catch(e) {
    console.error('[Assistente] Erro na busca vetorial:', e.message);
    resultado = buscarTFIDF(mensagem, disciplinaId, 6);
  }

  const { chunks, usouEmbeddings } = resultado;
  const contextoFormatado = formatarContexto(chunks);
  const fontes = [...new Set(chunks.map(c => c.fonte).filter(Boolean))];

  // Resumo global dos documentos indexados
  let resumoGlobal = '';
  if (disciplinaId) {
    const docs = dbFindAll('rag_documentos').filter(d => d.disciplina_id === Number(disciplinaId));
    if (docs.length > 0) {
      resumoGlobal = docs.map(d => `• ${d.titulo}: ${d.descricao || 'Documento indexado'}`).join('\n');
    }
  }

  // Histórico formatado (últimas 6 trocas)
  const historicoFormatado = sessao.historico.slice(-12, -1)
    .map(m => `${m.role === 'user' ? 'Aluno' : 'Assistente'}: ${m.content}`)
    .join('\n');

  // System prompt avançado
  const system = [
    '# Assistente Virtual RSC Academy',
    'Você é um assistente especializado na análise de documentos acadêmicos.',
    'Responda de forma clara, objetiva e didática, com base nos documentos fornecidos.',
    'Use markdown simples para formatação quando necessário.',
    '',
    resumoGlobal ? `## Documentos disponíveis:\n${resumoGlobal}` : '',
    '',
    contextoFormatado ? `## Base de conhecimento relevante:\n${contextoFormatado}` : '',
    '',
    historicoFormatado ? `## Histórico recente:\n${historicoFormatado}` : '',
    '',
    '## Instruções:',
    '- Baseie suas respostas prioritariamente nos documentos fornecidos',
    '- Cite o trecho/fonte quando usar uma informação específica do documento',
    '- Se a informação não estiver nos documentos, diga claramente: "Esta informação não está nos documentos carregados"',
    '- Seja didático e use exemplos quando possível',
    usouEmbeddings ? '- [Sistema: usando busca semântica avançada]' : '- [Sistema: usando busca por palavras-chave]',
  ].filter(Boolean).join('\n');

  // Chamar GPT
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: mensagem },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('OpenAI error: ' + (err.error?.message || res.statusText));
  }

  const data = await res.json();
  const resposta = data.choices?.[0]?.message?.content || 'Sem resposta.';

  addToSession(userId, 'assistant', resposta);

  // Marcar uso dos chunks
  chunks.forEach(c => { if (c.id) dbUpdate('rag_contextos', c.id, { vezes_usado: (c.vezes_usado||0)+1 }); });

  return {
    resposta,
    fontes,
    chunks_usados: chunks.length,
    usou_embeddings: usouEmbeddings,
    historico_tamanho: sessao.historico.length,
  };
}

module.exports = {
  chat,
  getSession,
  clearSession,
  indexarPendentes,
  indexarChunkComEmbedding,
  gerarResumoDocumento,
  buscarContextos,
};
