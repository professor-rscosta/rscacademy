const r = require('express').Router();
const c = require('../controllers/assistente.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');

r.use(authenticate);

// Chat principal com RAG
r.post('/chat',                    c.chat);

// Sessão
r.delete('/sessao',                c.limparSessao);
r.get('/sessao',                   c.statusSessao);

// Disciplinas disponíveis
r.get('/disciplinas',              c.disciplinas);

// Indexar embeddings (prof/admin)
r.post('/indexar',   profOuAdmin,  c.indexarEmbeddings);

// ChatPDF: upload de arquivo no chat (todos os perfis)
r.post('/upload',                  c.uploadChatFile);
r.post('/chat-arquivo',            c.chatComArquivo);

module.exports = r;
