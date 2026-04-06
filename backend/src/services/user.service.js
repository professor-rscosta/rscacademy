const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');

function sanitize(user) {
  if (!user) return null;
  const { senha_hash, ...safe } = user;
  return safe;
}

async function listAll() {
  return userRepository.findAll().map(sanitize);
}

async function listByStatus(status) {
  return userRepository.findByStatus(status).map(sanitize);
}

async function findById(id) {
  return sanitize(userRepository.findById(id));
}

async function create({ nome, email, senha, perfil, status }) {
  const existing = userRepository.findByEmail(email);
  if (existing) {
    const err = new Error('E-mail já cadastrado.');
    err.status = 409;
    throw err;
  }
  const senha_hash = await bcrypt.hash(senha, 12);
  const user = userRepository.create({ nome, email, senha_hash, perfil, status });
  return sanitize(user);
}

async function update(id, fields) {
  const existing = userRepository.findById(id);
  if (!existing) return null;

  // Prevent demoting the last admin
  if (existing.perfil === 'admin' && fields.perfil && fields.perfil !== 'admin') {
    const admins = userRepository.findAll().filter(u => u.perfil === 'admin');
    if (admins.length <= 1) {
      const err = new Error('Não é possível remover o último administrador.');
      err.status = 400;
      throw err;
    }
  }

  const updated = userRepository.update(id, fields);
  return sanitize(updated);
}

async function remove(id) {
  const user = userRepository.findById(id);
  if (!user) {
    const err = new Error('Usuário não encontrado.');
    err.status = 404;
    throw err;
  }
  if (user.perfil === 'admin') {
    const admins = userRepository.findAll().filter(u => u.perfil === 'admin');
    if (admins.length <= 1) {
      const err = new Error('Não é possível excluir o último administrador.');
      err.status = 400;
      throw err;
    }
  }
  userRepository.remove(id);
}

module.exports = { listAll, listByStatus, findById, create, update, remove };
