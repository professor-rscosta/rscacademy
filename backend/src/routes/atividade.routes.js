const r = require('express').Router();
const c = require('../controllers/atividade.controller');
const { authenticate, authorize, profOuAdmin, somenteAluno } = require('../middleware/auth.middleware');

r.use(authenticate);

// Listar e detalhe (filtrado por perfil no controller)
r.get('/',          c.list);
r.get('/:id',       c.getById);

// CRUD (professor/admin)
r.post('/',             profOuAdmin, c.create);
r.put('/:id',           profOuAdmin, c.update);
r.patch('/:id/publicar',profOuAdmin, c.publicar);
r.delete('/:id',        profOuAdmin, c.remove);

// Entregas — listar todas (professor)
r.get('/:id/entregas',  profOuAdmin, c.listarEntregas);

// Corrigir entrega (professor)
r.patch('/entrega/:entrega_id/corrigir', profOuAdmin, c.corrigirEntrega);

// Aluno: enviar e cancelar entrega
r.post('/:id/entregar',  authorize('aluno'), c.enviarEntrega);
r.delete('/:id/entregar',authorize('aluno'), c.cancelarEntrega);

module.exports = r;
