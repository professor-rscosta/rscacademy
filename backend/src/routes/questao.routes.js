/**
 * Questao Routes — RBAC
 * - GET: todos autenticados
 * - CRUD + IA: professor/admin
 */
const router = require('express').Router();
const ctrl   = require('../controllers/questao.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/',             ctrl.list);
router.get('/:id',          ctrl.getById);
router.get('/:id/curva',    ctrl.getCurva);
router.post('/',            profOuAdmin, ctrl.create);
router.post('/gerar',       profOuAdmin, ctrl.gerarComIA);
router.post('/sugerir-tri', profOuAdmin, ctrl.sugerirTRI);
router.post('/rag-context', profOuAdmin, ctrl.addRagContext);
router.put('/:id',          profOuAdmin, ctrl.update);
router.delete('/:id',       profOuAdmin, ctrl.remove);
module.exports = router;
