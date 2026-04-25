const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate } = require('../database/init');
const T = 'respostas';

// Only these columns exist in the MySQL respostas table
const ALLOWED = ['aluno_id','questao_id','trilha_id','resposta','correto','score','xp_ganho','tempo_gasto','feedback_ia'];

function filterCols(data) {
  const safe = {};
  ALLOWED.forEach(k => { if (data[k] !== undefined) safe[k] = data[k]; });
  return safe;
}

module.exports = {
  findAll:          async () => await dbFindAll(T),
  findById:         async (id) => await dbFindById(T, id),
  findByAluno:      async (uid) => await dbFindWhere(T, r => r.aluno_id === Number(uid)),
  findByQuestao:    async (qid) => await dbFindWhere(T, r => r.questao_id === Number(qid)),
  findByAlunoTrilha:async (uid, tid) => await dbFindWhere(T, r => r.aluno_id === Number(uid) && r.trilha_id === Number(tid)),
  create:           async (fields) => await dbInsert(T, filterCols(fields)),
  update:           async (id, f) => await dbUpdate(T, id, filterCols(f)),
  countByQuestao:   async (qid) => (await dbFindWhere(T, r => r.questao_id === Number(qid))).length,
};
