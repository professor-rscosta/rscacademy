const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'disciplinas';
module.exports = {
  findAll:             async () => (await dbFindAll(T)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:            async (id) => await dbFindById(T, id),
  findByProfessor:     async (pid) => await dbFindWhere(T, d=>d.professor_id===Number(pid)),
  create:              async (fields) => await dbInsert(T, fields),
  update:              async (id, f) => await dbUpdate(T, id, f),
  remove:              async (id) => await dbDelete(T, id),
};
