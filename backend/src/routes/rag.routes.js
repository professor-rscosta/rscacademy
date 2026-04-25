const r = require('express').Router();
const c = require('../controllers/rag.controller');
const { authenticate, profOuAdmin, authorize } = require('../middleware/auth.middleware');

r.use(authenticate);

r.get('/',              c.list);
r.get('/stats',         c.stats);
r.get('/search',        c.searchContextos);
r.get('/:id/contextos', c.listContextos);
r.post('/upload',       profOuAdmin, c.upload);
r.post('/:id/reindexar', profOuAdmin, c.reindexar);
r.delete('/:id',        profOuAdmin, c.remove);

module.exports = r;
