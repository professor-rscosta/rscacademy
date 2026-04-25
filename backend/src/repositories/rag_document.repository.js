/**
 * RAG Document Repository
 */
const {
  dbFindAll, dbFindById, dbFindWhere, dbInsert,
  dbUpdate, dbDelete, dbDeleteWhere
} = require('../database/init');

const D = 'rag_documentos';
const C = 'rag_contextos';

module.exports = {
  findAll:              async () => (await dbFindAll(D)||[]).filter(d => !d._deleted).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)),
  findById:             async (id) => await dbFindById(D, id),
  findByProf:           async (pid) => (await dbFindAll(D)||[]).filter(d => d.professor_id === Number(pid) && !d._deleted),
  findByDisciplina:     async (did) => (await dbFindAll(D)||[]).filter(d => d.disciplina_id === Number(did) && !d._deleted),
  create:               async (data) => await dbInsert(D, { ...data, created_at: new Date().toISOString() }),
  update:               async (id, f) => await dbUpdate(D, id, f),
  remove:               async (id) => await dbDelete(D, id),

  // Contextos (chunks) — excluir marcados como deletados
  findContextosByDoc:   async (docId) => (await dbFindAll(C)||[]).filter(c => c.doc_id === Number(docId) && !c._deleted),
  findContextosByDisc:  async (discId) => (await dbFindAll(C)||[]).filter(c => c.disciplina_id === Number(discId) && !c._deleted),
  createContexto:       async (data) => await dbInsert(C, { ...data, created_at: new Date().toISOString() }),

  // Deletar chunks de um documento via dbDeleteWhere (mais eficiente que update loop)
  deleteContextosByDoc: async (docId) => await dbDeleteWhere(C, c => c.doc_id === Number(docId)),
};
