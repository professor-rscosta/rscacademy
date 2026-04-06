const { dbFindAll,dbFindById,dbFindWhere,dbFindOne,dbInsert,dbUpdate,dbDelete } = require('../database/init');

const A='avaliacoes', T='tentativas';

module.exports = {
  // Avaliações
  findAll:           ()       => dbFindAll(A).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:          (id)     => dbFindById(A,id),
  findByProfessor:   (pid)    => dbFindWhere(A,a=>a.professor_id===Number(pid)),
  findByDisciplina:  (did)    => dbFindWhere(A,a=>a.disciplina_id===Number(did)),
  findByTurma:       (tid)    => dbFindWhere(A,a=>a.turma_id===Number(tid)),
  findDisponiveis:   ()       => dbFindWhere(A,a=>a.status==='publicada'),
  create:            (f)      => dbInsert(A,f),
  update:            (id,f)   => dbUpdate(A,id,f),
  remove:            (id)     => dbDelete(A,id),

  // Tentativas
  findTentativaById:       (id)        => dbFindById(T,id),
  findTentativasByAluno:   (uid)       => dbFindWhere(T,t=>t.aluno_id===Number(uid)),
  findTentativasByAvalia:  (aid)       => dbFindWhere(T,t=>t.avaliacao_id===Number(aid)),
  findTentativaAlunoAvalia:(uid,aid)   => dbFindWhere(T,t=>t.aluno_id===Number(uid)&&t.avaliacao_id===Number(aid)),
  findTentativaEmAberto:   (uid,aid)   => dbFindAll(T).find(t=>t.aluno_id===Number(uid)&&t.avaliacao_id===Number(aid)&&t.status==='em_andamento')||null,
  createTentativa:         (f)         => dbInsert(T,f),
  updateTentativa:         (id,f)      => dbUpdate(T,id,f),
};
