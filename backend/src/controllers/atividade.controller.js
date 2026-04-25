/**
 * Atividade Controller — Google Classroom style
 *
 * Professor: CRUD de atividades com materiais ricos
 * Aluno:     visualiza atividade + faz upload + gerencia entrega
 * Professor: corrige entrega com nota + feedback
 */
const repo      = require('../repositories/atividade.repository');
const turmaRepo = require('../repositories/turma.repository');
const adRepo    = require('../repositories/aluno_disciplina.repository');
const userRepo  = require('../repositories/user.repository');
const discRepo  = require('../repositories/disciplina.repository');
const tdRepo    = require('../repositories/turma_disciplina.repository');

// ════════════════════════════════════════════════════════════════
// ATIVIDADES
// ════════════════════════════════════════════════════════════════


// ── Helper: converte colunas DB → array arquivos ──────────────
function buildArquivos(e) {
  if (!e) return e;
  const arquivos = [];
  if (e.arquivo_base64 || e.arquivo_nome) {
    arquivos.push({
      base64:   e.arquivo_base64 || null,
      nome:     e.arquivo_nome   || 'arquivo',
      tipo:     e.arquivo_tipo   || 'application/octet-stream',
      tamanho:  e.arquivo_tamanho || 0,
    });
  }
  return { ...e, arquivos };
}

async function list(req, res, next) {
  try {
    const { professor_id, turma_id, disciplina_id } = req.query;
    let atividades;

    if (req.user.perfil === 'aluno') {
      // Aluno: atividades das suas turmas e disciplinas
      const mats = await turmaRepo.getTurmasAluno(req.user.id);
      const turmaIds = (mats || []).map(m => Number(m.turma_id));
      
      let todasAtividades = [];
      if (turmaIds.length) {
        const porTurma = await Promise.all(turmaIds.map(tid => repo.findByTurma(tid)));
        todasAtividades = porTurma.flat();
      }
      
      // Also fetch by disciplinas the aluno is enrolled in
      const discIds = await adRepo.disciplinaIds(req.user.id);
      if (discIds && discIds.length) {
        const porDisc = await Promise.all(discIds.map(did => repo.findByDisciplina(did)));
        todasAtividades = [...todasAtividades, ...porDisc.flat()];
      }
      
      // Dedup
      const seen = new Set();
      atividades = todasAtividades.filter(a => {
        if (!a || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      // Show publicadas (and ativas for compatibility)
      atividades = atividades.filter(a => a.status === 'publicada' || a.status === 'ativa');
    } else if (turma_id) {
      atividades = await repo.findByTurma(turma_id);
    } else if (professor_id) {
      atividades = await repo.findByProfessor(professor_id);
    } else if (req.user.perfil === 'professor') {
      atividades = await repo.findByProfessor(req.user.id);
    } else {
      atividades = await repo.findAll();
    }

    // Enriquecer com contagem de entregas
    atividades = await Promise.all(atividades.map(async a => {
      const entregas = await repo.findEntregasByAtividade(a.id);
      const disc = await discRepo.findById(a.disciplina_id);
      const turma = await turmaRepo.findById(a.turma_id);
      let minha_entrega = null;
      if (req.user.perfil === 'aluno') {
        const _me = await repo.findEntregaByAlunoAtiv(req.user.id, a.id);
      minha_entrega = _me ? buildArquivos(_me) : null;
      }
      return {
        ...a,
        total_entregas: entregas.length,
        entregas_pendentes: entregas.filter(e => e.status === 'entregue' && !e.nota).length,
        disciplina_nome: disc?.nome || null,
        turma_nome: turma?.nome || null,
        minha_entrega,
      };
    }));

    res.json({ atividades });
  } catch(e){ next(e); }
}

async function getById(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });

    // Aluno: verificar acesso pela turma
    if (req.user.perfil === 'aluno') {
      const turmaIds = (await turmaRepo.getTurmasAluno(req.user.id)).map(m => m.turma_id);
      if (!turmaIds.includes(a.turma_id))
        return res.status(403).json({ error: 'Atividade não pertence à sua turma.' });
    }

    const entregas = await repo.findEntregasByAtividade(a.id);
    const disc  = await discRepo.findById(a.disciplina_id);
    const turma = await turmaRepo.findById(a.turma_id);
    let minha_entrega = null;
    if (req.user.perfil === 'aluno') {
      const _me = await repo.findEntregaByAlunoAtiv(req.user.id, a.id);
      minha_entrega = _me ? buildArquivos(_me) : null;
    }

    res.json({
      atividade: {
        ...a,
        total_entregas: entregas.length,
        entregas_pendentes: entregas.filter(e => !e.nota).length,
        disciplina_nome: disc?.nome,
        turma_nome: turma?.nome,
        minha_entrega,
      }
    });
  } catch(e){ next(e); }
}

async function create(req, res, next) {
  try {
    const { titulo, instrucoes, turma_id, disciplina_id, pontos, data_entrega, materiais } = req.body;
    if (!titulo || !turma_id) return res.status(400).json({ error: 'titulo e turma_id são obrigatórios.' });

    // Professor só cria em suas turmas
    if (req.user.perfil === 'professor') {
      const turma = await turmaRepo.findById(turma_id);
      if (turma && turma.professor_id !== req.user.id)
        return res.status(403).json({ error: 'Você não é o professor desta turma.' });
    }

    const a = await repo.create({
      titulo,
      descricao: instrucoes || '',   // DB column is 'descricao'
      turma_id: Number(turma_id),
      disciplina_id: disciplina_id ? Number(disciplina_id) : null,
      professor_id: req.user.id,
      nota_maxima: pontos ? Number(pontos) : 10,
      data_entrega: data_entrega || null,
      status: 'rascunho',
    });
    res.status(201).json({ atividade: a });
  } catch(e){ next(e); }
}

async function update(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    if (req.user.perfil === 'professor' && a.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });
    const { instrucoes: ins2, pontos: pts2, ...rest2 } = req.body;
    const updateData = { ...rest2 };
    if (ins2 !== undefined) updateData.descricao = ins2;
    if (pts2 !== undefined) updateData.nota_maxima = Number(pts2);
    // Remove fields not in DB schema
    delete updateData.materiais;
    delete updateData.instrucoes;
    delete updateData.pontos;
    const updated = await repo.update(req.params.id, updateData);
    res.json({ atividade: updated });
  } catch(e){ next(e); }
}

async function publicar(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const updated = await repo.update(req.params.id, { status: 'publicada' });
    res.json({ atividade: updated, message: 'Atividade publicada!' });
  } catch(e){ next(e); }
}

async function remove(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    if (req.user.perfil === 'professor' && a.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });
    await repo.remove(req.params.id);
    res.json({ message: 'Atividade removida.' });
  } catch(e){ next(e); }
}

// ════════════════════════════════════════════════════════════════
// ENTREGAS (aluno envia arquivo)
// ════════════════════════════════════════════════════════════════

async function listarEntregas(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });

    const _raw = await repo.findEntregasByAtividade(a.id);
    const _enriched = await Promise.all(_raw.map(async e => {
      const aluno = await userRepo.findById(e.aluno_id);
      if (!aluno) return null;
      const { senha_hash, ...safe } = aluno;
      return { ...e, aluno: safe };
    }));
    const entregas = _enriched.filter(Boolean).map(buildArquivos).sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at));

    res.json({ entregas, total: entregas.length, pendentes: entregas.filter(e=>!e.nota).length });
  } catch(e){ next(e); }
}

async function enviarEntrega(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    if (a.status !== 'publicada') return res.status(400).json({ error: 'Atividade não está publicada.' });

    // Verificar turma OU disciplina do aluno
    const mats = await turmaRepo.getTurmasAluno(req.user.id);
    const turmaIds = (mats || []).map(m => Number(m.turma_id));
    
    // Check by turma
    const inTurma = a.turma_id && turmaIds.includes(Number(a.turma_id));
    
    // Check by disciplina (aluno can be enrolled in disciplina directly)
    let inDisc = false;
    if (!inTurma && a.disciplina_id) {
      const discIds = await adRepo.disciplinaIds(req.user.id);
      inDisc = (discIds || []).includes(Number(a.disciplina_id));
    }
    
    if (!inTurma && !inDisc)
      return res.status(403).json({ error: 'Você não está matriculado nesta atividade.' });

    const { arquivos, comentario } = req.body;
    const agora = new Date().toISOString();

    // Verificar se já entregou
    const existente = await repo.findEntregaByAlunoAtiv(req.user.id, a.id);
    if (existente) {
      // Atualizar entrega existente
      const arqAtualizado = arquivos && arquivos.length > 0 ? arquivos[0] : null;
      const updated = await repo.updateEntrega(existente.id, {
        arquivo_base64:    arqAtualizado?.base64    || existente.arquivo_base64    || null,
        arquivo_nome:      arqAtualizado?.nome      || existente.arquivo_nome      || null,
        arquivo_tipo:      arqAtualizado?.tipo      || existente.arquivo_tipo      || null,
        arquivo_tamanho:   arqAtualizado?.tamanho   || existente.arquivo_tamanho   || null,
        comentario: comentario !== undefined ? comentario : existente.comentario,
        status: 'entregue',
      });
      return res.json({ entrega: updated, message: 'Entrega atualizada!' });
    }

    // Map arquivos array to DB columns
    const arq = arquivos && arquivos.length > 0 ? arquivos[0] : {};
    const entrega = await repo.createEntrega({
      atividade_id:    a.id,
      aluno_id:        req.user.id,
      arquivo_base64:  arq.base64   || null,
      arquivo_nome:    arq.nome     || null,
      arquivo_tipo:    arq.tipo     || null,
      arquivo_tamanho: arq.tamanho  || null,
      comentario:      comentario   || '',
      status: 'entregue',
    });
    res.status(201).json({ entrega, message: 'Entrega enviada com sucesso!' });
  } catch(e){ next(e); }
}

async function cancelarEntrega(req, res, next) {
  try {
    const a = await repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const entrega = await repo.findEntregaByAlunoAtiv(req.user.id, a.id);
    if (!entrega) return res.status(404).json({ error: 'Nenhuma entrega encontrada.' });
    if (entrega.nota !== null) return res.status(400).json({ error: 'Entrega já corrigida, não pode ser cancelada.' });
    await repo.updateEntrega(entrega.id, { status: 'rascunho', entregue_em: null });
    res.json({ message: 'Entrega cancelada. Você pode reenviar.' });
  } catch(e){ next(e); }
}

async function corrigirEntrega(req, res, next) {
  try {
    const { entrega_id } = req.params;
    const { nota, feedback } = req.body;
    if (nota === undefined || nota < 0 || nota > 10)
      return res.status(400).json({ error: 'Nota deve estar entre 0 e 10.' });

    const entrega = await repo.findEntregaById(entrega_id);
    if (!entrega) return res.status(404).json({ error: 'Entrega não encontrada.' });

    const a = await repo.findById(entrega.atividade_id);
    if (req.user.perfil === 'professor' && a.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    const updated = await repo.updateEntrega(entrega_id, {
      nota: Number(nota),
      feedback_prof: feedback || '',
      status: 'devolvida',
      corrigido_em: new Date().toISOString(),
    });
    res.json({ entrega: updated, message: 'Entrega corrigida!' });
  } catch(e){ next(e); }
}

module.exports = { list, getById, create, update, publicar, remove, listarEntregas, enviarEntrega, cancelarEntrega, corrigirEntrega };
