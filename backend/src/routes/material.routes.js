const r=require('express').Router(), c=require('../controllers/material.controller');
const {authenticate,authorize}=require('../middleware/auth.middleware');
r.use(authenticate);
r.get('/',    c.listMateriais);
r.get('/:id', c.getMaterial);
r.post('/',   authorize('professor','admin'), c.createMaterial);
r.put('/:id', authorize('professor','admin'), c.updateMaterial);
r.delete('/:id', authorize('professor','admin'), c.deleteMaterial);
module.exports=r;
