const {
  dbFindAll,
  dbFindById,
  dbFindWhere,
  dbInsert,
  dbUpdate,
  dbDelete,
  dbQuery,
  dbQueryOne,
} = require('../database/init');

const TABLE = 'usuarios';

async function findAll() {
  return await dbQuery('SELECT * FROM `usuarios` ORDER BY created_at DESC');
}

async function findById(id) {
  return await dbFindById(TABLE, id);
}

async function findByEmail(email) {
  // Direct SQL — avoids dbFindOne que carrega todos os registros
  return await dbQueryOne('SELECT * FROM `usuarios` WHERE email = ? LIMIT 1', [email]);
}

async function findByStatus(status) {
  return await dbQuery('SELECT * FROM `usuarios` WHERE status = ? ORDER BY created_at DESC', [status]);
}

async function create({ nome, email, senha_hash, perfil, status }) {
  return await dbInsert(TABLE, { nome, email, senha_hash, perfil, status });
}

async function update(id, fields) {
  const allowed = ['nome', 'email', 'perfil', 'status', 'foto', 'bio',
                   'theta', 'xp_total', 'nivel', 'streak_dias', 'ultimo_acesso', 'senha_hash'];
  const safe = {};
  allowed.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k]; });
  return await dbUpdate(TABLE, id, safe);
}

async function remove(id) {
  return await dbDelete(TABLE, id);
}

module.exports = { findAll, findById, findByEmail, findByStatus, create, update, remove };
