const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'disciplinas';
module.exports = {
  findAll:             async () => (await dbFindAll(T)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:            async (id) => await dbFindById(T, id),
  findByProfessor:     async (pid) => await dbFindWhere(T, d=>d.professor_id===Number(pid)),
  create:              async (fields) => {
    const allowed = ['nome','descricao','professor_id','codigo','carga_horaria','ativo'];
    const safe = {};
    allowed.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k]; });
    return await dbInsert(T, safe);
  },
  update:              async (id, f) => {
    const allowed = ['nome','descricao','professor_id','codigo','carga_horaria','ativo',
                     'data_inicio','data_fim','turno','banner','professor_bio','professor_foto'];
    const safe = {};
    allowed.forEach(k => { if (f[k] !== undefined) safe[k] = f[k]; });
    return await dbUpdate(T, id, safe);
  },
  remove:              async (id) => await dbDelete(T, id),
};
