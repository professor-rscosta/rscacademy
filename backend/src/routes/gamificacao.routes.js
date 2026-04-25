const r=require('express').Router(),c=require('../controllers/gamificacao.controller');
const {authenticate}=require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/perfil',   c.meuPerfil);
r.get('/ranking',  c.ranking);
r.get('/medalhas', c.medalhas);
r.get('/missoes',  c.missoes);
module.exports=r;
