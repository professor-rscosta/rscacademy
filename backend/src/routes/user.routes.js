const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All user routes require authentication
router.use(authenticate);

// GET /api/users              → Admin only
router.get('/', authorize('admin'), userController.listUsers);

// GET /api/users/pending      → Admin only
router.get('/pending', authorize('admin'), userController.listPending);

// GET /api/users/:id          → Admin or own profile
router.get('/:id', userController.getUser);

// POST /api/users             → Admin only
router.post('/', authorize('admin'), userController.createUser);

// PUT /api/users/:id          → Admin only
router.put('/:id', authorize('admin'), userController.updateUser);

// PATCH /api/users/:id/approve → Admin only
router.patch('/:id/approve', authorize('admin'), userController.approveUser);

// DELETE /api/users/:id       → Admin only
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
