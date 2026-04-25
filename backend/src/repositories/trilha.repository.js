const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'trilhas';
module.exports = {
  findAll:             async () => (await dbFindAll(T)).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),
  findById:            async (id) => await dbFindById(T, id),
  findByDisciplina:    async (did) => (await dbFindWhere(T, t=>t.disciplina_id===Number(did))).sort((a,b)=>(a.ordem||0)-(b.ordem||0)),
  findByProfessor:     async (pid) => await dbFindWhere(T, t=>t.professor_id===Number(pid)),
  create:              async (fields) => {
    const allowed = ['nome','descricao','disciplina_id','professor_id','ordem','xp_total','ativo',
                     'tempo_limite','tentativas_maximas','nivel'];
    const safe = {};
    allowed.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k]; });
    return await dbInsert(T, safe);
  },
  update:              async (id, f) => {
    const allowed = ['nome','descricao','disciplina_id','professor_id','ordem','xp_total',
                     'ativo','tempo_limite','tentativas_maximas','nivel'];
    const safe = {};
    allowed.forEach(k => { if (f[k] !== undefined) safe[k] = f[k]; });
    return await dbUpdate(T, id, safe);
  },
  remove:              async (id) => await dbDelete(T, id),
};
