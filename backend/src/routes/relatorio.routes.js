const r=require('express').Router(), c=require('../controllers/relatorio.controller');
const {authenticate,authorize}=require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/admin',          authorize('admin'), c.adminGeral);
r.get('/professor',      authorize('professor','admin'), c.profGeral);
r.get('/turma/:turma_id',authorize('professor','admin'), c.porTurma);
r.get('/boletim/aluno/:aluno_id?', c.boletimAluno);         // aluno vê o próprio | prof/admin vê qualquer
r.get('/boletim/turma/:turma_id',   authorize('professor','admin'), c.boletimTurma);  // prof vê turma completa
module.exports=r;
// EOF already added above - need to add before module.exports
