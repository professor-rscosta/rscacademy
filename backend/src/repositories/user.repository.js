const {
  dbFindAll,
  dbFindById,
  dbFindOne,
  dbFindWhere,
  dbInsert,
  dbUpdate,
  dbDelete,
} = require('../database/init');

const TABLE = 'usuarios';

function findAll() {
  return dbFindAll(TABLE).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function findById(id) {
  return dbFindById(TABLE, id);
}

function findByEmail(email) {
  return dbFindOne(TABLE, u => u.email === email);
}

function findByStatus(status) {
  return dbFindWhere(TABLE, u => u.status === status)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function create({ nome, email, senha_hash, perfil, status }) {
  return dbInsert(TABLE, { nome, email, senha_hash, perfil, status });
}

function update(id, fields) {
  const allowed = ['nome', 'email', 'perfil', 'status'];
  const safe = {};
  allowed.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k]; });
  return dbUpdate(TABLE, id, safe);
}

function remove(id) {
  return dbDelete(TABLE, id);
}

module.exports = { findAll, findById, findByEmail, findByStatus, create, update, remove };
