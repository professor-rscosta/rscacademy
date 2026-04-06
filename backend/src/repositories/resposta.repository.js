const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate } = require('../database/init');
const T = 'respostas';
module.exports = {
  findAll:          ()         => dbFindAll(T),
  findById:         (id)       => dbFindById(T, id),
  findByAluno:      (uid)      => dbFindWhere(T, r=>r.aluno_id===Number(uid)),
  findByQuestao:    (qid)      => dbFindWhere(T, r=>r.questao_id===Number(qid)),
  findByAlunoTrilha:(uid, tid) => dbFindWhere(T, r=>r.aluno_id===Number(uid)&&r.trilha_id===Number(tid)),
  create:           (fields)   => dbInsert(T, fields),
  update:           (id, f)    => dbUpdate(T, id, f),
  countByQuestao:   (qid)      => dbFindWhere(T, r=>r.questao_id===Number(qid)).length,
};
