const { dbFindWhere, dbFindOne, dbInsert, dbDeleteWhere } = require('../database/init');
const T = 'aluno_disciplina';
module.exports = {
  findByAluno:         async (uid)      => await dbFindWhere(T, r => r.aluno_id === Number(uid)),
  findByDisciplina:    async (did)      => await dbFindWhere(T, r => r.disciplina_id === Number(did)),
  findByTurma:         async (tid)      => await dbFindWhere(T, r => r.turma_id === Number(tid)),
  findByAlunoTurma:    async (uid, tid) => await dbFindWhere(T, r => r.aluno_id === Number(uid) && r.turma_id === Number(tid)),
  disciplinaIds:       async (uid)      => (await dbFindWhere(T, r => r.aluno_id === Number(uid))).map(r => r.disciplina_id),
  disciplinaIdsDoAluno: async (alunoId, turmaIds) =>
    [...new Set((await dbFindWhere(T, r => r.aluno_id === Number(alunoId) && turmaIds.map(Number).includes(r.turma_id))).map(r => r.disciplina_id))],
  jaMatriculado: async (uid, did, tid) =>
    !!(await dbFindOne(T, r => r.aluno_id === Number(uid) && r.disciplina_id === Number(did) && r.turma_id === Number(tid))),
  matricular: async (uid, did, tid) => await dbInsert(T, {
    aluno_id: Number(uid), disciplina_id: Number(did), turma_id: Number(tid),
  }),
  desmatricular:        async (uid, did, tid) => await dbDeleteWhere(T, r => r.aluno_id === Number(uid) && r.disciplina_id === Number(did) && r.turma_id === Number(tid)),
  removerPorAlunoTurma: async (uid, tid)      => await dbDeleteWhere(T, r => r.aluno_id === Number(uid) && r.turma_id === Number(tid)),
  removerPorTurma:      async (tid)            => await dbDeleteWhere(T, r => r.turma_id === Number(tid)),
  removerPorDisciplina: async (did)            => await dbDeleteWhere(T, r => r.disciplina_id === Number(did)),
};
