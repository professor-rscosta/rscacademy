/**
 * RSC Academy — RAG Service
 * Retrieval-Augmented Generation com base de contextos educacionais
 * Usa TF-IDF simplificado + keyword matching para recuperação
 */
const { dbFindAll, dbInsert, dbUpdate } = require('../database/init');

// ─── Tokenização simples ──────────────────────────────────────
function tokenize(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// Stop words português
const STOP_WORDS = new Set(['que', 'para', 'uma', 'com', 'por', 'mais', 'como', 'mas', 'seu', 'sua', 'dos', 'das', 'nos', 'nas', 'num', 'numa', 'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'ela', 'ele', 'eles', 'elas', 'tem', 'ser', 'ter', 'foi', 'são', 'estão', 'pode', 'deve']);

function cleanTokens(tokens) {
  return tokens.filter(t => !STOP_WORDS.has(t) && t.length > 2);
}

// ─── TF-IDF Score ────────────────────────────────────────────
function tfScore(tokens, text) {
  const textTokens = cleanTokens(tokenize(text));
  const total = textTokens.length || 1;
  let score = 0;
  for (const t of tokens) {
    const count = textTokens.filter(w => w.includes(t) || t.includes(w)).length;
    score += count / total;
  }
  return score;
}

// ─── Recuperação de contextos ─────────────────────────────────

/**
 * Recupera os N contextos mais relevantes para uma query
 * @param {string} query - texto da busca
 * @param {string[]} tags - tags adicionais para filtro
 * @param {number} topK - quantidade máxima de contextos
 * @returns {Array} contextos ordenados por relevância
 */
function retrieveContext(query, tags = [], topK = 3) {
  const contextos = dbFindAll('rag_contextos');
  if (contextos.length === 0) return [];

  const queryTokens = cleanTokens(tokenize(query));
  const tagTokens   = tags.map(t => tokenize(t)).flat();
  const allTokens   = [...new Set([...queryTokens, ...tagTokens])];

  // Score: TF no título + TF no conteúdo + bonus de tags
  const scored = contextos.map(ctx => {
    let score = 0;
    score += tfScore(allTokens, ctx.titulo) * 3;    // título vale mais
    score += tfScore(allTokens, ctx.conteudo) * 2;
    score += tfScore(allTokens, (ctx.tags || []).join(' ')) * 4; // tags valem mais
    // Bonus por match exato de tag
    if (tags.some(t => (ctx.tags || []).some(ct => ct.toLowerCase().includes(t.toLowerCase())))) {
      score += 2;
    }
    return { ...ctx, _score: score };
  });

  return scored
    .filter(c => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
    .map(({ _score, ...ctx }) => ctx);
}

/**
 * Formata contextos para injetar no prompt da IA
 */
function formatContextForPrompt(contextos) {
  if (!contextos || contextos.length === 0) return '';
  return `\n\n--- CONTEXTO EDUCACIONAL (use para embasar a questão) ---\n${
    contextos.map((c, i) => `[${i+1}] ${c.titulo}:\n${c.conteudo}`).join('\n\n')
  }\n--- FIM DO CONTEXTO ---\n`;
}

/**
 * Adiciona novo contexto à base RAG
 */
function addContext({ titulo, conteudo, tags }) {
  return dbInsert('rag_contextos', { titulo, conteudo, tags: tags || [], uso_count: 0 });
}

/**
 * Incrementa contador de uso de um contexto
 */
function markUsed(contextId) {
  const ctx = dbFindAll('rag_contextos').find(c => c.id === Number(contextId));
  if (ctx) dbUpdate('rag_contextos', contextId, { uso_count: (ctx.uso_count || 0) + 1 });
}

module.exports = { retrieveContext, formatContextForPrompt, addContext, markUsed };
