/**
 * Resposta Routes — RBAC
 * - POST (submeter resposta): apenas ALUNO
 * - GET (stats por id alheio): apenas ADMIN
 */
const router = require('express').Router();
const ctrl   = require('../controllers/resposta.controller');
const { authenticate, authorize, somenteAluno } = require('../middleware/auth.middleware');

router.use(authenticate);

// Submeter resposta — apenas alunos
router.post('/', authorize('aluno'), ctrl.submitResposta);

// Leitura — aluno vê as próprias, professor/admin podem ver de outros
router.get('/minhas',              ctrl.listByAluno);
router.get('/trilha/:trilha_id',   ctrl.listByTrilha);
router.get('/stats/:id?',          ctrl.getStats);
router.get('/tentativas-trilha/:trilha_id', ctrl.tentativasTrilha);

module.exports = router;
