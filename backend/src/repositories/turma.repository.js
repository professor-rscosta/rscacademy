const { dbFindAll,dbFindById,dbFindWhere,dbFindOne,dbInsert,dbUpdate,dbDelete,dbDeleteWhere } = require('../database/init');
const T='turmas', AT='aluno_turma';
module.exports = {
  findAll:          async () => (await dbFindAll(T)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:         async (id) => await dbFindById(T,id),
  findByProfessor:  async (pid) => await dbFindWhere(T,t=>t.professor_id===Number(pid)),
  findByCodigo:     async (cod) => await dbFindOne(T,t=>t.codigo===cod.toUpperCase()),
  create:           async (f) => await dbInsert(T,f),
  update:           async (id,f) => await dbUpdate(T,id,f),
  remove:           async (id) => await dbDelete(T,id),
  getAlunos:        async (tid) => await dbFindWhere(AT,r=>r.turma_id===Number(tid)),
  getTurmasAluno:   async (uid) => await dbFindWhere(AT,r=>r.aluno_id===Number(uid)),
  matricular:       async (uid,tid) => await dbInsert(AT,{aluno_id:Number(uid),turma_id:Number(tid)}),
  desmatricular:    async (uid,tid) => await dbDeleteWhere(AT,r=>r.aluno_id===Number(uid)&&r.turma_id===Number(tid)),
  jaMatriculado:    async (uid,tid) => !!(await dbFindOne(AT,r=>r.aluno_id===Number(uid)&&r.turma_id===Number(tid))),
};
