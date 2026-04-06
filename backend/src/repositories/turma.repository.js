const { dbFindAll,dbFindById,dbFindWhere,dbFindOne,dbInsert,dbUpdate,dbDelete,dbDeleteWhere } = require('../database/init');
const T='turmas', AT='aluno_turma';
module.exports = {
  findAll:          ()        => dbFindAll(T).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:         (id)      => dbFindById(T,id),
  findByProfessor:  (pid)     => dbFindWhere(T,t=>t.professor_id===Number(pid)),
  findByDisciplina: (did)     => dbFindWhere(T,t=>t.disciplina_id===Number(did)),
  findByCodigo:     (cod)     => dbFindOne(T,t=>t.codigo_acesso===cod.toUpperCase()),
  create:           (f)       => dbInsert(T,f),
  update:           (id,f)    => dbUpdate(T,id,f),
  remove:           (id)      => dbDelete(T,id),
  // Alunos matriculados
  getAlunos:        (tid)     => dbFindWhere(AT,r=>r.turma_id===Number(tid)),
  getTurmasAluno:   (uid)     => dbFindWhere(AT,r=>r.aluno_id===Number(uid)),
  matricular:       (uid,tid) => dbInsert(AT,{aluno_id:Number(uid),turma_id:Number(tid)}),
  desmatricular:    (uid,tid) => dbDeleteWhere(AT,r=>r.aluno_id===Number(uid)&&r.turma_id===Number(tid)),
  jaMatriculado:    (uid,tid) => !!dbFindOne(AT,r=>r.aluno_id===Number(uid)&&r.turma_id===Number(tid)),
};
