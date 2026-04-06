/**
 * Turma-Disciplina Repository
 * Relaciona Turma ↔ Disciplina (N:N)
 */
const { dbFindAll, dbFindWhere, dbFindOne, dbInsert, dbDeleteWhere } = require('../database/init');
const T = 'turma_disciplinas';

module.exports = {
  findByTurma:      (tid)  => dbFindWhere(T, r => r.turma_id === Number(tid)),
  findByDisciplina: (did)  => dbFindWhere(T, r => r.disciplina_id === Number(did)),
  disciplinaIds:    (tid)  => dbFindWhere(T, r => r.turma_id === Number(tid)).map(r => r.disciplina_id),

  // IDs de disciplinas de TODAS as turmas do aluno (para filtro global)
  disciplinaIdsDoAluno: (turmaIds) => {
    const ids = new Set();
    dbFindAll(T).filter(r => turmaIds.map(Number).includes(r.turma_id)).forEach(r => ids.add(r.disciplina_id));
    return Array.from(ids);
  },

  jaVinculada: (tid, did) => !!dbFindOne(T, r => r.turma_id === Number(tid) && r.disciplina_id === Number(did)),

  vincular: (tid, did) => dbInsert(T, {
    turma_id: Number(tid), disciplina_id: Number(did), added_at: new Date().toISOString(),
  }),

  desvincular: (tid, did) => dbDeleteWhere(T, r => r.turma_id === Number(tid) && r.disciplina_id === Number(did)),
  limparTurma: (tid)      => dbDeleteWhere(T, r => r.turma_id === Number(tid)),
};
