/**
 * Atividade Repository
 * Atividade = tarefa criada pelo professor (Google Classroom style)
 * Entrega   = arquivo enviado pelo aluno como resposta
 */
const { dbFindAll, dbFindById, dbFindWhere, dbFindOne, dbInsert, dbUpdate, dbDelete, dbDeleteWhere } = require('../database/init');

const A = 'atividades';
const E = 'entregas_atividade';

module.exports = {
  // ── Atividades ─────────────────────────────────────────────
  findAll:           async () => (await dbFindAll(A)).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)),
  findById:          async (id) => await dbFindById(A, id),
  findByProfessor:   async (pid) => await dbFindWhere(A, a => a.professor_id === Number(pid)),
  findByTurma:       async (tid) => await dbFindWhere(A, a => a.turma_id === Number(tid)),
  findByDisciplina:  async (did) => await dbFindWhere(A, a => a.disciplina_id === Number(did)),
  create:            async (data) => await dbInsert(A, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  update:            async (id, f) => await dbUpdate(A, id, { ...f, updated_at: new Date().toISOString() }),
  remove:            async (id) => await dbDelete(A, id),

  // ── Entregas ────────────────────────────────────────────────
  findEntregaById:       async (id) => await dbFindById(E, id),
  findEntregasByAtividade: async (atid) => await dbFindWhere(E, e => e.atividade_id === Number(atid)),
  findEntregaByAlunoAtiv:  async (uid, atid) => await dbFindOne(E, e => e.aluno_id === Number(uid) && e.atividade_id === Number(atid)),
  findEntregasByAluno:     async (uid) => await dbFindWhere(E, e => e.aluno_id === Number(uid)),
  createEntrega:           async (data) => await dbInsert(E, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  updateEntrega:           async (id, f) => await dbUpdate(E, id, { ...f, updated_at: new Date().toISOString() }),
  deleteEntrega:           async (id) => await dbDelete(E, id),
};
