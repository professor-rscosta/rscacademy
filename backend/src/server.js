require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const { initDatabase } = require('./database/init');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Trust proxy (obrigatório na Hostinger) ────────────────────
app.set('trust proxy', 1);

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    const allowed = (process.env.FRONTEND_URL || '*').split(',').map(u => u.trim());

    // Whitelist explícita
    if (allowed.includes('*') || allowed.includes(origin)) return callback(null, true);

    // Permitir subdomínios Hostinger (preview/staging)
    if (/\.hostingersite\.com$/.test(origin)) return callback(null, true);
    if (/\.hostinger\.com$/.test(origin)) return callback(null, true);

    // Permitir localhost em qualquer porta
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);

    console.log('[CORS] Bloqueado:', origin);
    callback(new Error('CORS bloqueado: ' + origin));
  },
  credentials: true,
}));

// ── Rate limit ────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // corrige erro na Hostinger
}));

// ── Body parser ───────────────────────────────────────────────
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Rotas API (com e sem prefixo /api) ────────────────────────
const rotas = [
  ['auth',        './routes/auth.routes'],
  ['users',       './routes/user.routes'],
  ['disciplinas', './routes/disciplina.routes'],
  ['trilhas',     './routes/trilha.routes'],
  ['questoes',    './routes/questao.routes'],
  ['respostas',   './routes/resposta.routes'],
  ['turmas',      './routes/turma.routes'],
  ['materiais',   './routes/material.routes'],
  ['avisos',      './routes/aviso.routes'],
  ['relatorios',  './routes/relatorio.routes'],
  ['avaliacoes',  './routes/avaliacao.routes'],
  ['gamificacao', './routes/gamificacao.routes'],
  ['chatbot',     './routes/chatbot.routes'],
  ['atividades',  './routes/atividade.routes'],
  ['rag',         './routes/rag.routes'],
  ['assistente',   './routes/assistente.routes'],
  ['boletim',     './routes/boletim.routes'],
];

for (const [nome, arquivo] of rotas) {
  const router = require(arquivo);
  app.use(`/api/${nome}`, router); // local: localhost:3001/api/...
  app.use(`/${nome}`,     router); // Hostinger: remove /api no proxy
}

app.get('/api/health', (req, res) => {
  const provider = process.env.AI_PROVIDER || 'auto';
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui');
  const hasOpenAI = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sua_chave_aqui');
  const model = provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-2.0-flash')
              : provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
              : hasOpenAI ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : (process.env.GEMINI_MODEL || 'gemini-2.0-flash');
  res.json({
    status: 'ok',
    time: new Date(),
    ai: { provider, model, hasGemini, hasOpenAI },
    version: '2.0',
  });
});
app.get('/health',     (req, res) => res.json({ status: 'ok', time: new Date() }));

// Teste rápido da API de IA (sem autenticação - só para diagnóstico)
app.get('/api/ai/test', async (req, res) => {
  const provider  = process.env.AI_PROVIDER || 'auto';
  const hasOpenAI = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sua_chave_aqui');
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui');
  const model     = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!hasOpenAI && !hasGemini) {
    return res.status(503).json({ ok: false, error: 'Nenhuma chave de IA configurada.' });
  }

  try {
    const llm = require('./src/services/llm.service');
    const start = Date.now();
    const resp = await llm.chat({
      system: 'Responda apenas: OK',
      messages: [{ role: 'user', content: 'teste' }],
      maxTokens: 5,
    });
    res.json({
      ok: true,
      provider: llm.getProvider(),
      model,
      resposta: resp,
      latencia_ms: Date.now() - start,
    });
  } catch(e) {
    res.status(500).json({ ok: false, provider, error: e.message, statusCode: e.statusCode });
  }
});

// ── Frontend React (produção) ─────────────────────────────────
const frontendDist = path.join(__dirname, '../public'); // nodejs/public/ no Hostinger
const fs = require('fs');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Only serve SPA for non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Rota de API não encontrada: ' + req.path });
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
}

// ── Erro global ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno.' });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 RSC Academy Backend → http://localhost:${PORT}`);
    // Verificar provider configurado
    const provider = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');
    if (provider === 'gemini') {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'sua_chave_aqui') {
        console.warn('⚠️  GEMINI_API_KEY não configurada.');
      } else {
        const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        console.log('✅ Google Gemini conectado → ' + model);
      }
    } else {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sua_chave_aqui') {
        console.warn('⚠️  OPENAI_API_KEY não configurada.');
      } else {
        console.log('✅ OpenAI API conectada → ' + (process.env.OPENAI_MODEL || 'gpt-4o-mini'));
      }
    }
  });
}

start().catch(err => { console.error(err); process.exit(1); });
