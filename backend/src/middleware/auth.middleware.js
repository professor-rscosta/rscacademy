const jwt      = require('jsonwebtoken');
const userRepo = require('../repositories/user.repository');
const turmaRepo = require('../repositories/turma.repository');

// ── 1. Autenticação JWT ───────────────────────────────────────
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userRepo.findById(decoded.id);
    if (!user)             return res.status(401).json({ error: 'Usuário não encontrado.' });
    if (user.status !== 'ativo') return res.status(403).json({ error: 'Conta inativa ou pendente de aprovação.' });
    const { senha_hash, ...safe } = user;
    req.user = safe;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado. Faça login novamente.' : 'Token inválido.';
    return res.status(401).json({ error: msg });
  }
}

// ── 2. RBAC: perfis permitidos ────────────────────────────────
function authorize(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.user.perfil)) {
      return res.status(403).json({
        error: `Acesso negado. Perfil '${req.user.perfil}' não tem permissão para este recurso.`,
        perfil_atual: req.user.perfil,
        perfis_permitidos: perfis,
      });
    }
    next();
  };
}

// ── 3. Apenas alunos ──────────────────────────────────────────
const somenteAluno        = authorize('aluno');
const somenteProf         = authorize('professor');
const profOuAdmin         = authorize('professor', 'admin');
const somenteAdmin        = authorize('admin');
const qualquerAutenticado = (req, res, next) => next();

// ── 4. Professor só gerencia suas próprias turmas ─────────────
async function donoOuAdmin(req, res, next) {
  if (req.user.perfil === 'admin') return next();
  const turma = await turmaRepo.findById(req.params.id || req.params.turma_id);
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
  if (turma.professor_id !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado. Você não é o professor desta turma.' });
  }
  next();
}

// ── 5. Rate limiter de login ──────────────────────────────────
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true, legacyHeaders: false,
});

module.exports = { authenticate, authorize, loginLimiter, somenteAluno, somenteProf, profOuAdmin, somenteAdmin, donoOuAdmin };
