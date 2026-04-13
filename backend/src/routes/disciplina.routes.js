/**
 * Disciplina Routes — RBAC
 * - GET: todos autenticados (aluno vê disciplinas da sua turma)
 * - CRUD: professor/admin
 */
const router = require('express').Router();
const ctrl   = require('../controllers/disciplina.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/',      ctrl.list);
router.get('/:id/modulo', ctrl.getModulo);
router.get('/:id',   ctrl.getById);
router.post('/',     profOuAdmin, ctrl.create);
router.put('/:id',   profOuAdmin, ctrl.update);
router.delete('/:id',profOuAdmin, ctrl.remove);
module.exports = router;
