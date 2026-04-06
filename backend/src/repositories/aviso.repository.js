const { dbFindAll,dbFindById,dbFindWhere,dbInsert,dbUpdate,dbDelete } = require('../database/init');
const T='avisos';
module.exports = {
  findAll:        ()       => dbFindAll(T).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:       (id)     => dbFindById(T,id),
  findByTurma:    (tid)    => dbFindWhere(T,a=>a.turma_id===Number(tid)),
  findByProfessor:(pid)    => dbFindWhere(T,a=>a.professor_id===Number(pid)),
  create:         (f)      => dbInsert(T,f),
  update:         (id,f)   => dbUpdate(T,id,f),
  remove:         (id)     => dbDelete(T,id),
};
