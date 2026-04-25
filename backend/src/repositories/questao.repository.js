const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'questoes';
module.exports = {
  findAll:          async () => (await dbFindAll(T)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:         async (id) => await dbFindById(T, id),
  findByTrilha:     async (tid) => await dbFindWhere(T, q=>q.trilha_id===Number(tid)&&q.ativo!==false),
  findByDisciplina: async (did) => await dbFindWhere(T, q=>q.disciplina_id===Number(did)&&q.ativo!==false),
  findAll:          async () => (await dbFindAll(T)).filter(q=>q.ativo!==false),
  findByProfessor:  async (pid) => await dbFindWhere(T, q=>q.professor_id===Number(pid)),
  create:           async (fields) => await dbInsert(T, fields),
  update:           async (id, f) => await dbUpdate(T, id, f),
  remove:           async (id) => await dbUpdate(T, id, { ativo: false }),
  updateTRI:        async (id, tri) => await dbUpdate(T, id, { tri }),
};
