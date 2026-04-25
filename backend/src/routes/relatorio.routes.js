const r = require('express').Router();
const c = require('../controllers/relatorio.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

r.use(authenticate);

r.get('/admin',                           authorize('admin'),                  c.adminGeral);
r.get('/professor',                       authorize('professor','admin'),      c.profGeral);
r.get('/turma/:turma_id',                 authorize('professor','admin'),      c.porTurma);
r.get('/turma/:turma_id/completo',        authorize('professor','admin'),      c.turmaCompleto);
r.get('/trilha/:trilha_id',               authorize('professor','admin'),      c.porTrilha);
r.get('/aluno/:aluno_id?',                                                     c.relatorioAluno);
r.get('/boletim/aluno/:aluno_id?',                                             c.boletimAluno);
r.get('/boletim/turma/:turma_id',         authorize('professor','admin'),      c.boletimTurma);
r.get('/exportar/:tipo/:id',              authorize('professor','admin'),      c.exportarExcel);

module.exports = r;
