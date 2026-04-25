const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'trilhas';
module.exports = {
  findAll:             async () => (await dbFindAll(T)).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),
  findById:            async (id) => await dbFindById(T, id),
  findByDisciplina:    async (did) => (await dbFindWhere(T, t=>t.disciplina_id===Number(did))).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),
  findByProfessor:     async (pid) => await dbFindWhere(T, t=>t.professor_id===Number(pid)),
  create:              async (fields) => await dbInsert(T, fields),
  update:              async (id, f) => await dbUpdate(T, id, f),
  remove:              async (id) => await dbDelete(T, id),
};
