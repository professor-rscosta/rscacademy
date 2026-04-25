const { dbFindAll,dbFindById,dbFindWhere,dbInsert,dbUpdate,dbDelete } = require('../database/init');
const T='avisos';
module.exports = {
  findAll:        async () => (await dbFindAll(T)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:       async (id) => await dbFindById(T,id),
  findByTurma:    async (tid) => await dbFindWhere(T,a=>a.turma_id===Number(tid)),
  findByProfessor:async (pid) => await dbFindWhere(T,a=>a.professor_id===Number(pid)),
  create:         async (f) => await dbInsert(T,f),
  update:         async (id,f) => await dbUpdate(T,id,f),
  remove:         async (id) => await dbDelete(T,id),
};
