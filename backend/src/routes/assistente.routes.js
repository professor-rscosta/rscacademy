const r = require('express').Router();
const c = require('../controllers/assistente.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');

r.use(authenticate);

r.post('/chat',                    c.chat);
r.delete('/sessao',                c.limparSessao);
r.get('/sessao',                   c.statusSessao);
r.get('/disciplinas',              c.disciplinas);
r.post('/indexar',   profOuAdmin,  c.indexarEmbeddings);

module.exports = r;
