const r = require('express').Router();
const c = require('../controllers/boletim.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/turma/:turma_id',    profOuAdmin, c.boletimTurma);
r.get('/aluno/:aluno_id?',              c.boletimAluno);
module.exports = r;
