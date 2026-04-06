const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'trilhas';
module.exports = {
  findAll:             ()        => dbFindAll(T).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),
  findById:            (id)      => dbFindById(T, id),
  findByDisciplina:    (did)     => dbFindWhere(T, t=>t.disciplina_id===Number(did)).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),
  findByProfessor:     (pid)     => dbFindWhere(T, t=>t.professor_id===Number(pid)),
  create:              (fields)  => dbInsert(T, fields),
  update:              (id, f)   => dbUpdate(T, id, f),
  remove:              (id)      => dbDelete(T, id),
};
