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
    const allowed = (process.env.FRONTEND_URL || '*').split(',').map(u => u.trim());
    if (allowed.includes('*') || allowed.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
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
  ['boletim',     './routes/boletim.routes'],
];

for (const [nome, arquivo] of rotas) {
  const router = require(arquivo);
  app.use(`/api/${nome}`, router); // local: localhost:3001/api/...
  app.use(`/${nome}`,     router); // Hostinger: remove /api no proxy
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.get('/health',     (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Frontend React (produção) ─────────────────────────────────
const frontendDist = path.join(__dirname, '../public');
const fs = require('fs');

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
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
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sua_chave_aqui') {
      console.warn('⚠️  OPENAI_API_KEY não configurada.');
    } else {
      console.log('✅ OpenAI API conectada → gpt-4o-mini');
    }
  });
}

start().catch(err => { console.error(err); process.exit(1); });