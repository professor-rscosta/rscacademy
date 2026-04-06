const { dbFindAll,dbFindById,dbFindWhere,dbInsert,dbUpdate,dbDelete } = require('../database/init');
const T='materiais';
module.exports = {
  findAll:           ()      => dbFindAll(T).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:          (id)    => dbFindById(T,id),
  findByDisciplina:  (did)   => dbFindWhere(T,m=>m.disciplina_id===Number(did)),
  findByProfessor:   (pid)   => dbFindWhere(T,m=>m.professor_id===Number(pid)),
  create:            (f)     => dbInsert(T,f),
  update:            (id,f)  => dbUpdate(T,id,f),
  remove:            (id)    => dbDelete(T,id),
};
