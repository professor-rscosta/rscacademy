const { dbFindAll, dbFindById, dbFindWhere, dbInsert, dbUpdate, dbDelete } = require('../database/init');
const T = 'questoes';
module.exports = {
  findById:         async (id) => await dbFindById(T, id),
  findByTrilha:     async (tid) => await dbFindWhere(T, q=>q.trilha_id===Number(tid)&&q.ativo!==false),
  findByDisciplina: async (did) => await dbFindWhere(T, q=>q.disciplina_id===Number(did)&&q.ativo!==false),
  findAll:          async () => (await dbFindAll(T)).filter(q=>q.ativo!==false),
  findByProfessor:  async (pid) => await dbFindWhere(T, q=>q.professor_id===Number(pid)),
  create:           async (fields) => {
    // Ensure JSON columns are valid JSON strings
    const jsonCols = ['gabarito','alternativas','tri','midias','rag_tags'];
    for (const col of jsonCols) {
      if (fields[col] !== undefined && fields[col] !== null) {
        if (typeof fields[col] === 'string') {
          try { JSON.parse(fields[col]); } // already valid JSON
          catch { fields[col] = JSON.stringify(fields[col]); } // wrap string as JSON
        }
      }
    }
    const allowed = ['trilha_id','disciplina_id','professor_id','tipo','enunciado','alternativas',
                     'gabarito','xp','midias','rag_tags','habilidade_bncc','instrucoes_correcao',
                     'tri','uso','tipo_uso','ativo','nivel','dica','explicacao','instrucoes_extras'];
    const safe = {};
    allowed.forEach(k => { if (fields[k] !== undefined) safe[k] = fields[k]; });
    // Map tipo_uso -> uso if uso not set
    if (!safe.uso && safe.tipo_uso) safe.uso = safe.tipo_uso;
    return await dbInsert(T, safe);
  },
  update:           async (id, f) => {
    const allowed = ['trilha_id','disciplina_id','professor_id','tipo','enunciado','alternativas',
                     'gabarito','xp','midias','rag_tags','habilidade_bncc','instrucoes_correcao',
                     'tri','uso','tipo_uso','ativo','nivel','dica','explicacao','instrucoes_extras'];
    const safe = {};
    allowed.forEach(k => { if (f[k] !== undefined) safe[k] = f[k]; });
    return await dbUpdate(T, id, safe);
  },
  remove:           async (id) => await dbUpdate(T, id, { ativo: false }),
  updateTRI:        async (id, tri) => await dbUpdate(T, id, { tri }),
};
