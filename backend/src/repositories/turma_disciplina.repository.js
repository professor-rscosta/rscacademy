const { dbFindAll, dbFindWhere, dbFindOne, dbInsert, dbDeleteWhere } = require('../database/init');
const T = 'turma_disciplinas';
module.exports = {
  findByTurma:      async (tid) => await dbFindWhere(T, r => r.turma_id === Number(tid)),
  findByDisciplina: async (did) => await dbFindWhere(T, r => r.disciplina_id === Number(did)),
  disciplinaIds:    async (tid) => (await dbFindWhere(T, r => r.turma_id === Number(tid))).map(r => r.disciplina_id),
  disciplinaIdsDoAluno: async (turmaIds) => {
    const ids = new Set();
    (await dbFindAll(T)).filter(r => turmaIds.map(Number).includes(r.turma_id)).forEach(r => ids.add(r.disciplina_id));
    return Array.from(ids);
  },
  jaVinculada:  async (tid, did) => !!(await dbFindOne(T, r => r.turma_id === Number(tid) && r.disciplina_id === Number(did))),
  vincular:     async (tid, did) => await dbInsert(T, { turma_id: Number(tid), disciplina_id: Number(did) }),
  desvincular:  async (tid, did) => await dbDeleteWhere(T, r => r.turma_id === Number(tid) && r.disciplina_id === Number(did)),
  limparTurma:  async (tid) => await dbDeleteWhere(T, r => r.turma_id === Number(tid)),
};
