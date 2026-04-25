const { dbFindAll,dbFindById,dbFindWhere,dbInsert,dbUpdate,dbDelete } = require('../database/init');
const T='materiais';
module.exports = {
  findAll:           async () => (await dbFindAll(T)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  findById:          async (id) => await dbFindById(T,id),
  findByDisciplina:  async (did) => await dbFindWhere(T,m=>m.disciplina_id===Number(did)),
  findByProfessor:   async (pid) => await dbFindWhere(T,m=>m.professor_id===Number(pid)),
  create: async (f) => {
    const allowed = ['titulo','descricao','tipo','url','conteudo','base64','file_name','file_size','disciplina_id','professor_id'];
    const safe = {};
    allowed.forEach(k => { if (f[k] !== undefined) safe[k] = f[k]; });
    // Map camelCase from frontend
    if (f.fileName && !safe.file_name) safe.file_name = f.fileName;
    if (f.fileSize && !safe.file_size) safe.file_size = f.fileSize;
    return await dbInsert(T, safe);
  },
  update: async (id, f) => {
    const allowed = ['titulo','descricao','tipo','url','conteudo','base64','file_name','file_size','disciplina_id'];
    const safe = {};
    allowed.forEach(k => { if (f[k] !== undefined) safe[k] = f[k]; });
    // Map camelCase from frontend
    if (f.fileName !== undefined) safe.file_name = f.fileName;
    if (f.fileSize !== undefined) safe.file_size = f.fileSize;
    // Remove unknown fields
    delete safe.fileName; delete safe.fileSize;
    return await dbUpdate(T, id, safe);
  },
  remove:            async (id) => await dbDelete(T,id),
};
