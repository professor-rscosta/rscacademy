const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    const result = await authService.login(email, senha);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    if (!['professor', 'aluno'].includes(perfil)) {
      return res.status(400).json({ error: 'Perfil inválido. Use professor ou aluno.' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
    }
    const result = await authService.register({ nome, email, senha, perfil });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}


// ── Atualizar perfil próprio ──────────────────────────────────
async function updateMe(req, res, next) {
  try {
    const { nome, foto } = req.body;
    const { dbUpdate, dbFindById } = require('../database/init');

    const updates = {};
    if (nome?.trim()) updates.nome = nome.trim();
    if (foto !== undefined) updates.foto = foto; // base64 ou null para remover

    const updated = await dbUpdate('usuarios', req.user.id, updates);
    if (!updated) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const { senha_hash, ...safe } = updated;
    res.json({ user: safe, message: 'Perfil atualizado!' });
  } catch(e){ next(e); }
}

module.exports = { updateMe, login, register, me };
