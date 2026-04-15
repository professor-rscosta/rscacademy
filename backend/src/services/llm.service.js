/**
 * RSC Academy — LLM Service v3 (Multi-provider)
 *
 * Providers suportados:
 *   AI_PROVIDER=openai  → OpenAI GPT (Chat Completions API)
 *   AI_PROVIDER=gemini  → Google Gemini
 *
 * Variáveis de ambiente:
 *   AI_PROVIDER=openai       (ou 'gemini')
 *   OPENAI_API_KEY=sk-proj-...
 *   OPENAI_MODEL=gpt-4o-mini (padrão)
 *   GEMINI_API_KEY=AIza...
 *   GEMINI_MODEL=gemini-2.0-flash (padrão)
 */

// ─────────────────────────────────────────────────────────────
// PROVIDER DETECTION
// ─────────────────────────────────────────────────────────────
function getProvider() {
  const p = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  if (p === 'openai') return 'openai';
  if (p === 'gemini') return 'gemini';
  // Auto-detect
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sua_chave_aqui') return 'openai';
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui') return 'gemini';
  return 'openai'; // padrão
}

function getApiKey(provider) {
  const k = provider === 'gemini'
    ? process.env.GEMINI_API_KEY
    : process.env.OPENAI_API_KEY;

  if (!k || k === 'sua_chave_aqui') {
    const varName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
    throw Object.assign(new Error(varName + ' não configurada nas variáveis de ambiente.'), { code: 'NO_API_KEY', statusCode: 503 });
  }
  return k;
}

// ─────────────────────────────────────────────────────────────
// OPENAI — Chat Completions API
// ─────────────────────────────────────────────────────────────
async function callOpenAI({ system, messages, maxTokens = 1500, jsonMode = false }) {
  const apiKey = getApiKey('openai');
  const model  = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  console.log('[OpenAI] Chamando modelo:', model, '| mensagens:', messages.length);

  const body = {
    model,
    max_tokens: maxTokens,
    temperature: 0.4,
    messages: [
      { role: 'system', content: system || 'Você é um assistente educacional.' },
      ...messages.map(m => ({ role: m.role, content: m.content || '' })),
    ],
  };

  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || res.statusText || 'Erro desconhecido';
    console.error('[OpenAI] Erro HTTP', res.status + ':', msg);

    const err = new Error('OpenAI ' + res.status + ': ' + msg);
    err.statusCode = res.status;
    err.openaiCode  = data.error?.code || data.error?.type;

    if (res.status === 401) err.message = 'OPENAI_API_KEY inválida ou expirada. Verifique a chave no painel OpenAI.';
    if (res.status === 429) err.message = 'Limite de requisições OpenAI atingido. Aguarde e tente novamente.';
    if (res.status === 402) err.message = 'Créditos OpenAI esgotados. Adicione créditos em platform.openai.com.';
    if (res.status === 503) err.message = 'OpenAI indisponível no momento. Tente novamente em instantes.';
    throw err;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.warn('[OpenAI] Resposta vazia:', JSON.stringify(data).slice(0, 200));
    throw new Error('OpenAI retornou resposta vazia. finish_reason: ' + (data.choices?.[0]?.finish_reason || 'desconhecido'));
  }

  console.log('[OpenAI] ✅ Resposta recebida | tokens:', data.usage?.total_tokens || '?');
  return content;
}

// ─────────────────────────────────────────────────────────────
// GEMINI — Generate Content API
// ─────────────────────────────────────────────────────────────
async function callGemini({ system, messages, maxTokens = 1500 }) {
  const apiKey = getApiKey('gemini');
  const model  = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  // Routing: Gemini 1.x usa v1, Gemini 2.x usa v1beta
  const apiVer = model.startsWith('gemini-1.') ? 'v1' : 'v1beta';
  const url    = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent`;

  console.log('[Gemini] Chamando modelo:', model, '| API:', apiVer);

  const contents = [];
  if (system) {
    contents.push({ role: 'user',  parts: [{ text: '[Sistema]\n' + system }] });
    contents.push({ role: 'model', parts: [{ text: 'Entendido.' }] });
  }
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: m.content || '' }] });
  }

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body:    JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 } }),
    signal:  AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || res.statusText;
    console.error('[Gemini] Erro HTTP', res.status + ':', msg);
    const err = new Error('Gemini ' + res.status + ': ' + msg);
    err.statusCode = res.status;
    if (res.status === 429) err.message = 'Limite Gemini atingido. Aguarde e tente novamente.';
    if (res.status === 404) err.message = 'Modelo "' + model + '" não encontrado. Tente: gemini-2.0-flash';
    throw err;
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini retornou resposta vazia.');
  console.log('[Gemini] ✅ Resposta recebida');
  return content;
}

// ─────────────────────────────────────────────────────────────
// EMBEDDINGS
// ─────────────────────────────────────────────────────────────
async function getEmbedding(text) {
  const provider = getProvider();

  if (provider === 'gemini') {
    const apiKey = getApiKey('gemini');
    const url = 'https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
    });
    if (!res.ok) { console.error('[Gemini] embedding error:', res.status); return []; }
    const data = await res.json();
    return data.embedding?.values || [];
  }

  // OpenAI
  const apiKey = getApiKey('openai');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('OpenAI embedding ' + res.status + ': ' + (err.error?.message || res.statusText));
  }
  const data = await res.json();
  return data.data[0].embedding;
}

// ─────────────────────────────────────────────────────────────
// MAIN CHAT FUNCTION
// ─────────────────────────────────────────────────────────────
async function chat({ system, messages, maxTokens = 1500, jsonMode = false }) {
  const provider = getProvider();
  console.log('[LLM] Provider:', provider, '| maxTokens:', maxTokens);

  try {
    if (provider === 'gemini') return await callGemini({ system, messages, maxTokens });
    return await callOpenAI({ system, messages, maxTokens, jsonMode });
  } catch(e) {
    // Enriquecer o erro com informações de diagnóstico
    console.error('[LLM] ❌ Erro:', e.message);
    if (!e.statusCode) e.statusCode = 500;
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    return null;
  }
}

module.exports = { chat, getEmbedding, parseJSON, getProvider };
