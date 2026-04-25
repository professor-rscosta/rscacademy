const r=require('express').Router(), c=require('../controllers/material.controller');
const {authenticate,authorize}=require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/',    c.listAvisos);
r.post('/',   authorize('professor','admin'), c.createAviso);
r.delete('/:id', authorize('professor','admin'), c.deleteAviso);
module.exports=r;
