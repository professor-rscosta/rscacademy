const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'disciplinas';
module.exports = {
  findAll:             ()       => dbFindAll(T).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:            (id)     => dbFindById(T, id),
  findByProfessor:     (pid)    => dbFindWhere(T, d=>d.professor_id===Number(pid)),
  create:              (fields) => dbInsert(T, fields),
  update:              (id, f)  => dbUpdate(T, id, f),
  remove:              (id)     => dbDelete(T, id),
};
