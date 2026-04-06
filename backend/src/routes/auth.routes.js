const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate, loginLimiter } = require('../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', loginLimiter, authController.login);

// POST /api/auth/register
router.post('/register', authController.register);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, authController.me);

module.exports = router;
