/**
 * Aluno-Disciplina Repository
 * Matrícula INDIVIDUAL por disciplina (não automática por turma)
 */
const { dbFindAll, dbFindWhere, dbFindOne, dbInsert, dbDeleteWhere } = require('../database/init');
const T = 'aluno_disciplina';

module.exports = {
  // Buscar matrículas de um aluno
  findByAluno:       (uid) => dbFindWhere(T, r => r.aluno_id === Number(uid)),

  // Buscar alunos em uma disciplina específica
  findByDisciplina:  (did) => dbFindWhere(T, r => r.disciplina_id === Number(did)),

  // Buscar por turma (todos os vínculos de uma turma)
  findByTurma:       (tid) => dbFindWhere(T, r => r.turma_id === Number(tid)),

  // Buscar disciplinas de um aluno em uma turma específica
  findByAlunoTurma:  (uid, tid) =>
    dbFindWhere(T, r => r.aluno_id === Number(uid) && r.turma_id === Number(tid)),

  // IDs das disciplinas de um aluno (globalmente)
  disciplinaIds: (uid) =>
    [...new Set(dbFindWhere(T, r => r.aluno_id === Number(uid)).map(r => r.disciplina_id))],

  // IDs das disciplinas de um aluno filtrados por lista de turmas
  disciplinaIdsDoAluno: (alunoId, turmaIds) =>
    [...new Set(
      dbFindWhere(T, r => r.aluno_id === Number(alunoId) && turmaIds.map(Number).includes(r.turma_id))
        .map(r => r.disciplina_id)
    )],

  // Verificar se aluno já está matriculado na disciplina
  jaMatriculado: (uid, did, tid) =>
    !!dbFindOne(T, r => r.aluno_id === Number(uid) && r.disciplina_id === Number(did) && r.turma_id === Number(tid)),

  // Matricular aluno em uma disciplina
  matricular: (uid, did, tid) => {
    if (module.exports.jaMatriculado(uid, did, tid)) return null;
    return dbInsert(T, {
      aluno_id:      Number(uid),
      disciplina_id: Number(did),
      turma_id:      Number(tid),
      enrolled_at:   new Date().toISOString(),
    });
  },

  // Desmatricular aluno de uma disciplina
  desmatricular: (uid, did, tid) =>
    dbDeleteWhere(T, r => r.aluno_id === Number(uid) && r.disciplina_id === Number(did) && r.turma_id === Number(tid)),

  // Remover todas as matrículas de um aluno em uma turma
  removerPorAlunoTurma: (uid, tid) =>
    dbDeleteWhere(T, r => r.aluno_id === Number(uid) && r.turma_id === Number(tid)),

  // Remover todas as matrículas de uma turma (ao deletar turma)
  removerPorTurma: (tid) =>
    dbDeleteWhere(T, r => r.turma_id === Number(tid)),

  // Remover todas as matrículas de uma disciplina (ao deletar disciplina)
  removerPorDisciplina: (did) =>
    dbDeleteWhere(T, r => r.disciplina_id === Number(did)),
};
