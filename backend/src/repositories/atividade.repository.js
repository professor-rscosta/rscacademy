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
  create: async (data) => {
    const allowed = ['titulo','descricao','instrucoes','tipo','professor_id','turma_id',
                     'disciplina_id','data_entrega','aceita_apos_prazo','nota_maxima','status'];
    const safe = {};
    allowed.forEach(k => { if (data[k] !== undefined) safe[k] = data[k]; });
    // Map instrucoes -> descricao if needed
    if (safe.instrucoes && !safe.descricao) { safe.descricao = safe.instrucoes; delete safe.instrucoes; }
    if (safe.instrucoes) delete safe.instrucoes; // remove after mapping
    return await dbInsert(A, safe);
  },
  update: async (id, f) => {
    const allowed = ['titulo','descricao','tipo','turma_id','disciplina_id',
                     'data_entrega','aceita_apos_prazo','nota_maxima','status'];
    const safe = {};
    allowed.forEach(k => { if (f[k] !== undefined) safe[k] = f[k]; });
    if (f.instrucoes !== undefined) safe.descricao = f.instrucoes;
    return await dbUpdate(A, id, safe);
  },
  remove:            async (id) => await dbDelete(A, id),

  // ── Entregas ────────────────────────────────────────────────
  findEntregaById:       async (id) => await dbFindById(E, id),
  findEntregasByAtividade: async (atid) => await dbFindWhere(E, e => e.atividade_id === Number(atid)),
  findEntregaByAlunoAtiv:  async (uid, atid) => await dbFindOne(E, e => e.aluno_id === Number(uid) && e.atividade_id === Number(atid)),
  findEntregasByAluno:     async (uid) => await dbFindWhere(E, e => e.aluno_id === Number(uid)),
  createEntrega: async (data) => {
    const allowed = ['atividade_id','aluno_id','arquivo_base64','arquivo_nome','arquivo_tipo','arquivo_tamanho','comentario','nota','feedback','status'];
    const safe = {};
    allowed.forEach(k => { if (data[k] !== undefined) safe[k] = data[k]; });
    return await dbInsert(E, safe);
  },
  updateEntrega:           async (id, f) => await dbUpdate(E, id, { ...f, updated_at: new Date().toISOString() }),
  deleteEntrega:           async (id) => await dbDelete(E, id),
};
