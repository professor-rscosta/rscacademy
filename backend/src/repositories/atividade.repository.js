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
  findAll:           ()       => dbFindAll(A).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)),
  findById:          (id)     => dbFindById(A, id),
  findByProfessor:   (pid)    => dbFindWhere(A, a => a.professor_id === Number(pid)),
  findByTurma:       (tid)    => dbFindWhere(A, a => a.turma_id === Number(tid)),
  findByDisciplina:  (did)    => dbFindWhere(A, a => a.disciplina_id === Number(did)),
  create:            (data)   => dbInsert(A, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  update:            (id, f)  => dbUpdate(A, id, { ...f, updated_at: new Date().toISOString() }),
  remove:            (id)     => dbDelete(A, id),

  // ── Entregas ────────────────────────────────────────────────
  findEntregaById:       (id)          => dbFindById(E, id),
  findEntregasByAtividade: (atid)      => dbFindWhere(E, e => e.atividade_id === Number(atid)),
  findEntregaByAlunoAtiv:  (uid, atid) => dbFindOne(E, e => e.aluno_id === Number(uid) && e.atividade_id === Number(atid)),
  findEntregasByAluno:     (uid)       => dbFindWhere(E, e => e.aluno_id === Number(uid)),
  createEntrega:           (data)      => dbInsert(E, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  updateEntrega:           (id, f)     => dbUpdate(E, id, { ...f, updated_at: new Date().toISOString() }),
  deleteEntrega:           (id)        => dbDelete(E, id),
};
