const r = require('express').Router();
const c = require('../controllers/chatbot.controller');
const { authenticate } = require('../middleware/auth.middleware');
r.use(authenticate);
r.post('/mensagem', c.chat);
r.get('/disciplinas', c.disciplinas);
module.exports = r;
