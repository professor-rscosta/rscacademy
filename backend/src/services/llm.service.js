/**
 * RSC Academy — LLM Service (Multi-provider)
 * Suporta: OpenAI GPT-4o-mini | Google Gemini
 * Configurado via variáveis de ambiente:
 *   AI_PROVIDER=gemini  → usa Gemini
 *   AI_PROVIDER=openai  → usa OpenAI (padrão)
 *   GEMINI_API_KEY=...
 *   OPENAI_API_KEY=...
 */

// ── Detectar provider ─────────────────────────────────────────
function getProvider() {
  const p = (process.env.AI_PROVIDER || '').toLowerCase();
  if (p === 'gemini') return 'gemini';
  if (process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) return 'gemini';
  if (process.env.GEMINI_API_KEY && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sua_chave_aqui')) return 'gemini';
  return 'openai';
}

// ── Validar chave disponível ──────────────────────────────────
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

// ── Chamada OpenAI ────────────────────────────────────────────
async function callOpenAI({ system, messages, maxTokens = 1500, jsonMode = false }) {
  const apiKey = getApiKey('openai');
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
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
  const model  = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

  // Converter formato de mensagens para Gemini
  const contents = [];

  // System prompt → primeiro turn do user se Gemini não suportar system
  if (system) {
    contents.push({ role: 'user', parts: [{ text: '<<SYSTEM>>\n' + system + '\n<</SYSTEM>>' }] });
    contents.push({ role: 'model', parts: [{ text: 'Entendido. Seguirei as instruções fornecidas.' }] });
  }

  // Converter histórico
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: m.content || '' }] });
  }

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || res.statusText;
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
    const model  = 'text-embedding-004';
    const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('Gemini embedding: ' + (err.error?.message || res.statusText));
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
    if (provider === 'gemini') return await callGemini({ system, messages, maxTokens });
    return await callOpenAI({ system, messages, maxTokens, jsonMode });
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
