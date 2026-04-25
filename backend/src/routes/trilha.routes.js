/**
 * Trilha Routes — RBAC
 * - GET: todos autenticados (aluno vê trilhas da sua turma via disciplina)
 * - CRUD: professor/admin
 */
const router = require('express').Router();
const ctrl   = require('../controllers/trilha.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getById);
router.post('/',     profOuAdmin, ctrl.create);
router.put('/:id',   profOuAdmin, ctrl.update);
router.delete('/:id',profOuAdmin, ctrl.remove);
module.exports = router;
