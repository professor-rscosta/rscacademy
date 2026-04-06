const userService = require('../services/user.service');

async function listUsers(req, res, next) {
  try {
    const users = await userService.listAll();
    res.json({ users });
  } catch (err) { next(err); }
}

async function getUser(req, res, next) {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user });
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const { nome, email, senha, perfil, status } = req.body;
    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }
    const user = await userService.create({ nome, email, senha, perfil, status: status || 'ativo' });
    res.status(201).json({ user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { nome, email, perfil, status } = req.body;
    const user = await userService.update(req.params.id, { nome, email, perfil, status });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await userService.remove(req.params.id);
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function approveUser(req, res, next) {
  try {
    const user = await userService.update(req.params.id, { status: 'ativo' });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user, message: 'Usuário aprovado com sucesso.' });
  } catch (err) { next(err); }
}

async function listPending(req, res, next) {
  try {
    const users = await userService.listByStatus('pendente');
    res.json({ users });
  } catch (err) { next(err); }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, approveUser, listPending };
