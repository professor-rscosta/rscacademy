/**
 * RSC Academy — Web Search Service
 * 
 * Implementa busca na web como fallback do RAG.
 * Providers suportados (por prioridade):
 *   1. Google Custom Search API  (GOOGLE_SEARCH_KEY + GOOGLE_SEARCH_CX)
 *   2. SerpAPI                   (SERPAPI_KEY)
 *   3. DuckDuckGo Instant Answer (gratuito, sem chave, limitado)
 */

const CACHE = new Map(); // cache simples em memória
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// ── Limpar cache expirado ─────────────────────────────────────
function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  // Manter cache pequeno (max 100 entradas)
  if (CACHE.size > 100) CACHE.delete(CACHE.keys().next().value);
}

// ── Google Custom Search API ──────────────────────────────────
async function searchGoogle(query) {
  const key = process.env.GOOGLE_SEARCH_KEY;
  const cx  = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return null;

  const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=5&hl=pt-BR`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  return (data.items || []).map(item => ({
    titulo:  item.title,
    snippet: item.snippet,
    url:     item.link,
    fonte:   new URL(item.link).hostname,
  }));
}

// ── SerpAPI ───────────────────────────────────────────────────
async function searchSerpAPI(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return null;

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=pt&api_key=${key}&num=5`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  return (data.organic_results || []).slice(0, 5).map(r => ({
    titulo:  r.title,
    snippet: r.snippet,
    url:     r.link,
    fonte:   new URL(r.link).hostname,
  }));
}

// ── DuckDuckGo Instant Answer (sem chave) ─────────────────────
async function searchDuckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=br-pt`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();

    const results = [];

    // AbstractText (resposta direta)
    if (data.AbstractText) {
      results.push({
        titulo:  data.Heading || query,
        snippet: data.AbstractText.slice(0, 500),
        url:     data.AbstractURL || '',
        fonte:   data.AbstractSource || 'DuckDuckGo',
      });
    }

    // RelatedTopics
    (data.RelatedTopics || []).slice(0, 4).forEach(t => {
      if (t.Text) results.push({
        titulo:  t.Text.split(' - ')[0] || query,
        snippet: t.Text.slice(0, 300),
        url:     t.FirstURL || '',
        fonte:   'DuckDuckGo',
      });
    });

    return results.length > 0 ? results : null;
  } catch(e) {
    console.error('[WebSearch] DuckDuckGo error:', e.message);
    return null;
  }
}

// ── Função principal de busca ─────────────────────────────────
async function search(query) {
  // Verificar cache
  const cacheKey = query.toLowerCase().trim();
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[WebSearch] Cache hit:', query.slice(0, 50));
    return { ...cached, fromCache: true };
  }

  console.log('[WebSearch] Buscando:', query.slice(0, 80));

  let resultados = null;
  let provider   = '';

  // Tentar providers em ordem de prioridade
  if (process.env.GOOGLE_SEARCH_KEY) {
    resultados = await searchGoogle(query);
    provider   = 'Google';
  }
  if (!resultados && process.env.SERPAPI_KEY) {
    resultados = await searchSerpAPI(query);
    provider   = 'SerpAPI';
  }
  if (!resultados) {
    resultados = await searchDuckDuckGo(query);
    provider   = 'DuckDuckGo';
  }

  if (!resultados || resultados.length === 0) return null;

  const data = { resultados, provider };
  setCache(cacheKey, data);
  return data;
}

// ── Formatar resultados para prompt ──────────────────────────
function formatarParaPrompt(resultados) {
  return resultados.map((r, i) =>
    `[Fonte ${i+1}: ${r.fonte}]\nTítulo: ${r.titulo}\n${r.snippet}\nURL: ${r.url}`
  ).join('\n\n---\n\n');
}

// ── Verificar se web search está disponível ───────────────────
function estaDisponivel() {
  return !!(process.env.GOOGLE_SEARCH_KEY || process.env.SERPAPI_KEY || true); // DuckDuckGo sempre disponível
}

module.exports = { search, formatarParaPrompt, estaDisponivel };
