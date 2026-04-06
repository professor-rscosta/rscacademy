/**
 * Atividade Controller — Google Classroom style
 *
 * Professor: CRUD de atividades com materiais ricos
 * Aluno:     visualiza atividade + faz upload + gerencia entrega
 * Professor: corrige entrega com nota + feedback
 */
const repo      = require('../repositories/atividade.repository');
const turmaRepo = require('../repositories/turma.repository');
const userRepo  = require('../repositories/user.repository');
const discRepo  = require('../repositories/disciplina.repository');
const tdRepo    = require('../repositories/turma_disciplina.repository');

// ════════════════════════════════════════════════════════════════
// ATIVIDADES
// ════════════════════════════════════════════════════════════════

async function list(req, res, next) {
  try {
    const { professor_id, turma_id, disciplina_id } = req.query;
    let atividades;

    if (req.user.perfil === 'aluno') {
      // Aluno: atividades das suas turmas
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      if (!turmaIds.length) return res.json({ atividades: [] });
      atividades = turmaIds.flatMap(tid => repo.findByTurma(tid))
        .filter(a => a.status === 'publicada');
      // Dedup
      const seen = new Set();
      atividades = atividades.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
    } else if (turma_id) {
      atividades = repo.findByTurma(turma_id);
    } else if (professor_id) {
      atividades = repo.findByProfessor(professor_id);
    } else if (req.user.perfil === 'professor') {
      atividades = repo.findByProfessor(req.user.id);
    } else {
      atividades = repo.findAll();
    }

    // Enriquecer com contagem de entregas
    atividades = atividades.map(a => {
      const entregas = repo.findEntregasByAtividade(a.id);
      const disc = discRepo.findById(a.disciplina_id);
      const turma = turmaRepo.findById(a.turma_id);
      let minha_entrega = null;
      if (req.user.perfil === 'aluno') {
        minha_entrega = repo.findEntregaByAlunoAtiv(req.user.id, a.id) || null;
      }
      return {
        ...a,
        total_entregas: entregas.length,
        entregas_pendentes: entregas.filter(e => e.status === 'entregue' && !e.nota).length,
        disciplina_nome: disc?.nome || null,
        turma_nome: turma?.nome || null,
        minha_entrega,
      };
    });

    res.json({ atividades });
  } catch(e){ next(e); }
}

async function getById(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });

    // Aluno: verificar acesso pela turma
    if (req.user.perfil === 'aluno') {
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      if (!turmaIds.includes(a.turma_id))
        return res.status(403).json({ error: 'Atividade não pertence à sua turma.' });
    }

    const entregas = repo.findEntregasByAtividade(a.id);
    const disc  = discRepo.findById(a.disciplina_id);
    const turma = turmaRepo.findById(a.turma_id);
    let minha_entrega = null;
    if (req.user.perfil === 'aluno') {
      minha_entrega = repo.findEntregaByAlunoAtiv(req.user.id, a.id) || null;
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
      const turma = turmaRepo.findById(turma_id);
      if (turma && turma.professor_id !== req.user.id)
        return res.status(403).json({ error: 'Você não é o professor desta turma.' });
    }

    const a = repo.create({
      titulo, instrucoes: instrucoes || '',
      turma_id: Number(turma_id),
      disciplina_id: disciplina_id ? Number(disciplina_id) : null,
      professor_id: req.user.id,
      pontos: pontos ? Number(pontos) : 10,
      data_entrega: data_entrega || null,
      materiais: materiais || [],
      status: 'rascunho',
    });
    res.status(201).json({ atividade: a });
  } catch(e){ next(e); }
}

async function update(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    if (req.user.perfil === 'professor' && a.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });
    const updated = repo.update(req.params.id, req.body);
    res.json({ atividade: updated });
  } catch(e){ next(e); }
}

async function publicar(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const updated = repo.update(req.params.id, { status: 'publicada' });
    res.json({ atividade: updated, message: 'Atividade publicada!' });
  } catch(e){ next(e); }
}

async function remove(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    if (req.user.perfil === 'professor' && a.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });
    repo.remove(req.params.id);
    res.json({ message: 'Atividade removida.' });
  } catch(e){ next(e); }
}

// ════════════════════════════════════════════════════════════════
// ENTREGAS (aluno envia arquivo)
// ════════════════════════════════════════════════════════════════

async function listarEntregas(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });

    const entregas = repo.findEntregasByAtividade(a.id).map(e => {
      const aluno = userRepo.findById(e.aluno_id);
      if (!aluno) return null;
      const { senha_hash, ...safe } = aluno;
      return { ...e, aluno: safe };
    }).filter(Boolean).sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at));

    res.json({ entregas, total: entregas.length, pendentes: entregas.filter(e=>!e.nota).length });
  } catch(e){ next(e); }
}

async function enviarEntrega(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    if (a.status !== 'publicada') return res.status(400).json({ error: 'Atividade não está publicada.' });

    // Verificar turma do aluno
    const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
    if (!turmaIds.includes(a.turma_id))
      return res.status(403).json({ error: 'Atividade não pertence à sua turma.' });

    const { arquivos, comentario } = req.body;
    const agora = new Date().toISOString();

    // Verificar se já entregou
    const existente = repo.findEntregaByAlunoAtiv(req.user.id, a.id);
    if (existente) {
      // Atualizar entrega existente
      const updated = repo.updateEntrega(existente.id, {
        arquivos: arquivos || existente.arquivos,
        comentario: comentario !== undefined ? comentario : existente.comentario,
        status: 'entregue',
        entregue_em: agora,
      });
      return res.json({ entrega: updated, message: 'Entrega atualizada!' });
    }

    const entrega = repo.createEntrega({
      atividade_id: a.id,
      aluno_id: req.user.id,
      arquivos: arquivos || [],
      comentario: comentario || '',
      status: 'entregue',
      nota: null,
      feedback_prof: null,
      entregue_em: agora,
    });
    res.status(201).json({ entrega, message: 'Entrega enviada com sucesso!' });
  } catch(e){ next(e); }
}

async function cancelarEntrega(req, res, next) {
  try {
    const a = repo.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const entrega = repo.findEntregaByAlunoAtiv(req.user.id, a.id);
    if (!entrega) return res.status(404).json({ error: 'Nenhuma entrega encontrada.' });
    if (entrega.nota !== null) return res.status(400).json({ error: 'Entrega já corrigida, não pode ser cancelada.' });
    repo.updateEntrega(entrega.id, { status: 'rascunho', entregue_em: null });
    res.json({ message: 'Entrega cancelada. Você pode reenviar.' });
  } catch(e){ next(e); }
}

async function corrigirEntrega(req, res, next) {
  try {
    const { entrega_id } = req.params;
    const { nota, feedback } = req.body;
    if (nota === undefined || nota < 0 || nota > 10)
      return res.status(400).json({ error: 'Nota deve estar entre 0 e 10.' });

    const entrega = repo.findEntregaById(entrega_id);
    if (!entrega) return res.status(404).json({ error: 'Entrega não encontrada.' });

    const a = repo.findById(entrega.atividade_id);
    if (req.user.perfil === 'professor' && a.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    const updated = repo.updateEntrega(entrega_id, {
      nota: Number(nota),
      feedback_prof: feedback || '',
      status: 'devolvida',
      corrigido_em: new Date().toISOString(),
    });
    res.json({ entrega: updated, message: 'Entrega corrigida!' });
  } catch(e){ next(e); }
}

module.exports = { list, getById, create, update, publicar, remove, listarEntregas, enviarEntrega, cancelarEntrega, corrigirEntrega };
