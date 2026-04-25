const { dbFindAll,dbFindById,dbFindWhere,dbFindOne,dbInsert,dbUpdate,dbDelete } = require('../database/init');

const A='avaliacoes', T='tentativas';

module.exports = {
  // Avaliações
  findAll:           async () => (await dbFindAll(A)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:          async (id) => await dbFindById(A,id),
  findByProfessor:   async (pid) => await dbFindWhere(A,a=>a.professor_id===Number(pid)),
  findByDisciplina:  async (did) => await dbFindWhere(A,a=>a.disciplina_id===Number(did)),
  findByTurma:       async (tid) => await dbFindWhere(A,a=>a.turma_id===Number(tid)),
  findByTurmaAndDisciplina: async (tid,did) => await dbFindWhere(A,a=>a.turma_id===Number(tid)&&a.disciplina_id===Number(did)),
  findByAluno:       async (aid) => {
    // Find all avaliacoes linked to turmas the aluno is in
    const { dbQuery } = require('../database/init');
    return await dbQuery(
      'SELECT DISTINCT a.* FROM avaliacoes a ' +
      'LEFT JOIN turma_avaliacoes ta ON ta.avaliacao_id = a.id ' +
      'LEFT JOIN aluno_turma at2 ON at2.turma_id = COALESCE(a.turma_id, ta.turma_id) ' +
      'WHERE at2.aluno_id = ? AND a.status = "publicada"',
      [Number(aid)]
    );
  },
  findDisponiveis:   async () => await dbFindWhere(A,a=>a.status==='publicada'),
  create:            async (f) => await dbInsert(A,f),
  update:            async (id,f) => await dbUpdate(A,id,f),
  remove:            async (id) => await dbDelete(A,id),

  // Tentativas
  findTentativaById:       async (id) => await dbFindById(T,id),
  findTentativasByAluno:   async (uid) => await dbFindWhere(T,t=>t.aluno_id===Number(uid)),
  findTentativasByAvalia:  async (aid) => await dbFindWhere(T,t=>t.avaliacao_id===Number(aid)),
  findTentativaAlunoAvalia:async (uid,aid) => await dbFindWhere(T,t=>t.aluno_id===Number(uid)&&t.avaliacao_id===Number(aid)),
  findTentativaEmAberto:   async (uid,aid) => (await dbFindAll(T)).find(t=>t.aluno_id===Number(uid)&&t.avaliacao_id===Number(aid)&&t.status==='em_andamento')||null,
  createTentativa:         async (f) => await dbInsert(T,f),
  updateTentativa:         async (id,f) => await dbUpdate(T,id,f),
};
