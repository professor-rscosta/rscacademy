const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate } = require('../database/init');
const T = 'respostas';
module.exports = {
  findAll:          async () => await dbFindAll(T),
  findById:         async (id) => await dbFindById(T, id),
  findByAluno:      async (uid) => await dbFindWhere(T, r=>r.aluno_id===Number(uid)),
  findByQuestao:    async (qid) => await dbFindWhere(T, r=>r.questao_id===Number(qid)),
  findByAlunoTrilha:async (uid, tid) => await dbFindWhere(T, r=>r.aluno_id===Number(uid)&&r.trilha_id===Number(tid)),
  create:           async (fields) => await dbInsert(T, fields),
  update:           async (id, f) => await dbUpdate(T, id, f),
  countByQuestao:   async (qid) => (await dbFindWhere(T, r=>r.questao_id===Number(qid))).length,
};
