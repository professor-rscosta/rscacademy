/**
 * RSC Academy — LLM Service (Multi-provider)
 * Suporta: OpenAI GPT-4o-mini | Google Gemini
 *
 * Configurar no .env / Hostinger:
 *   AI_PROVIDER=gemini
 *   GEMINI_API_KEY=AIza...
 *   GEMINI_MODEL=gemini-2.0-flash   (padrão, funciona no free tier)
 *
 * Modelos Gemini testados (API v1beta, free tier):
 *   gemini-2.0-flash          ✅ recomendado
 *   gemini-2.0-flash-lite     ❌ quota 0 no free
 *   gemini-1.5-flash          ❌ não disponível em v1beta (usa v1)
 *   gemini-flash-latest       ✅ alias para versão mais recente
 */

// ── Detectar provider ─────────────────────────────────────────
function getProvider() {
  const p = (process.env.AI_PROVIDER || '').toLowerCase();
  if (p === 'gemini') return 'gemini';
  if (p === 'openai') return 'openai';
  // Auto-detect: Gemini se tiver chave Gemini e não tiver OpenAI
  if (process.env.GEMINI_API_KEY && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sua_chave_aqui')) return 'gemini';
  return 'openai';
}

// ── Validar chave ─────────────────────────────────────────────
function getApiKey(provider) {
  if (provider === 'gemini') {
    const k = process.env.GEMINI_API_KEY;
    if (!k || k === 'sua_chave_aqui') throw new Error('GEMINI_API_KEY não configurada.');
    return k;
  }
  const k = process.env.OPENAI_API_KEY;
  if (!k || k === 'sua_chave_aqui') throw new Error('OPENAI_API_KEY não configurada.');
  return k;
}

// ── Retry com backoff ─────────────────────────────────────────
async function withRetry(fn, maxAttempts = 2, baseDelay = 10000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch(e) {
      const is429 = e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('rate') || e.message?.includes('limite');
      if (is429 && i < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log('[LLM] Rate limit (429). Aguardando ' + (delay/1000) + 's antes da tentativa ' + (i+2) + '/' + maxAttempts + '...');
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
}

// ── Chamada OpenAI ────────────────────────────────────────────
async function callOpenAI({ system, messages, maxTokens = 1500, jsonMode = false }) {
  const apiKey = getApiKey('openai');
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, ...messages],
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('OpenAI ' + res.status + ': ' + (err.error?.message || res.statusText));
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Chamada Gemini ────────────────────────────────────────────
async function callGemini({ system, messages, maxTokens = 1500 }) {
  const apiKey = getApiKey('gemini');
  // gemini-2.0-flash: melhor opção free tier via v1beta
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  // Gemini 1.5 usa API v1, Gemini 2.0 usa v1beta
  const apiVersion = model.startsWith('gemini-1.') ? 'v1' : 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;

  // Montar contents: system + histórico
  const contents = [];
  if (system) {
    // Gemini suporta systemInstruction em 1.5+ - usar como campo separado é mais limpo
    // Fallback: injetar como primeiro turn
    contents.push({ role: 'user', parts: [{ text: '[SISTEMA]\n' + system }] });
    contents.push({ role: 'model', parts: [{ text: 'Entendido.' }] });
  }
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: m.content || '' }] });
  }

  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || res.statusText;
    if (res.status === 429) throw new Error('Gemini 429: limite atingido. Tente novamente em instantes.');
    if (res.status === 404) throw new Error('Gemini 404: modelo "' + model + '" não encontrado. Verifique GEMINI_MODEL. Use: gemini-2.0-flash');
    throw new Error('Gemini ' + res.status + ': ' + msg);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Embeddings ────────────────────────────────────────────────
async function getEmbedding(text) {
  const provider = getProvider();

  if (provider === 'gemini') {
    const apiKey = getApiKey('gemini');
    // text-embedding-004 disponível apenas em v1 (não v1beta)
    const embModel = 'text-embedding-004';
    const url = `https://generativelanguage.googleapis.com/v1/models/${embModel}:embedContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Se embedding falhar, retornar array vazio (fallback para TF-IDF)
      console.error('[LLM] Gemini embedding error:', err.error?.message || res.status);
      return [];
    }
    const data = await res.json();
    return data.embedding?.values || [];
  }

  // OpenAI embeddings
  const apiKey = getApiKey('openai');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('OpenAI embedding: ' + (err.error?.message || res.statusText));
  }
  const data = await res.json();
  return data.data[0].embedding;
}

// ── Função principal ──────────────────────────────────────────
async function chat({ system, messages, maxTokens = 1500, jsonMode = false }) {
  const provider = getProvider();
  try {
    if (provider === 'gemini') return await withRetry(() => callGemini({ system, messages, maxTokens }));
    return await withRetry(() => callOpenAI({ system, messages, maxTokens, jsonMode }));
  } catch(e) {
    console.error('[LLM] ' + provider + ' error:', e.message);
    throw e;
  }
}

// ── Parse JSON seguro ─────────────────────────────────────────
function parseJSON(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch { return null; } }
    return null;
  }
}

module.exports = { chat, getEmbedding, parseJSON, getProvider };
