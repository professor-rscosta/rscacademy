const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'questoes';
module.exports = {
  findAll:          ()       => dbFindAll(T).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:         (id)     => dbFindById(T, id),
  findByTrilha:     (tid)    => dbFindWhere(T, q=>q.trilha_id===Number(tid)&&q.ativo!==false),
  findByDisciplina: (did)    => dbFindWhere(T, q=>q.disciplina_id===Number(did)&&q.ativo!==false),
  findAll:          ()       => dbFindAll(T).filter(q=>q.ativo!==false),
  findByProfessor:  (pid)    => dbFindWhere(T, q=>q.professor_id===Number(pid)),
  create:           (fields) => dbInsert(T, fields),
  update:           (id, f)  => dbUpdate(T, id, f),
  remove:           (id)     => dbUpdate(T, id, { ativo: false }),
  updateTRI:        (id, tri)=> dbUpdate(T, id, { tri }),
};
