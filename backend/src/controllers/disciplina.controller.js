/**
 * Disciplina Controller — com filtro RBAC
 *
 * Fluxo:
 *   ALUNO → vê apenas disciplinas das suas turmas (via turma_disciplinas)
 *   PROFESSOR → vê suas próprias disciplinas
 *   ADMIN → vê todas
 */
const repo          = require('../repositories/disciplina.repository');
const turmaRepo     = require('../repositories/turma.repository');
const tdRepo        = require('../repositories/turma_disciplina.repository');
const userRepo      = require('../repositories/user.repository');
const materialRepo  = require('../repositories/material.repository');
const trilhaRepo    = require('../repositories/trilha.repository');
const questaoRepo   = require('../repositories/questao.repository');
const respostaRepo  = require('../repositories/resposta.repository');
const atividadeRepo = require('../repositories/atividade.repository');
const avaliacaoRepo = require('../repositories/avaliacao.repository');

async function list(req, res, next) {
  try {
    const { professor_id } = req.query;
    let disciplinas;

    if (req.user.perfil === 'aluno') {
      // Aluno: disciplinas das turmas em que está matriculado
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      if (turmaIds.length === 0) return res.json({ disciplinas: [] });
      const discIds = tdRepo.disciplinaIdsDoAluno(turmaIds);
      disciplinas = discIds.map(id => repo.findById(id)).filter(Boolean);
    } else if (professor_id) {
      disciplinas = repo.findByProfessor(professor_id);
    } else if (req.user.perfil === 'professor') {
      disciplinas = repo.findByProfessor(req.user.id);
    } else {
      disciplinas = repo.findAll();
    }

    // Enriquecer com nome do professor
    disciplinas = disciplinas.map(d => {
      const prof = d.professor_id ? userRepo.findById(d.professor_id) : null;
      return { ...d, professor_nome: prof ? prof.nome : null };
    });

    res.json({ disciplinas });
  } catch(e){ next(e); }
}

async function getById(req, res, next) {
  try {
    const d = repo.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Disciplina não encontrada.' });

    // Aluno só pode ver disciplina da sua turma
    if (req.user.perfil === 'aluno') {
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      const discIds  = tdRepo.disciplinaIdsDoAluno(turmaIds);
      if (!discIds.includes(d.id)) {
        return res.status(403).json({ error: 'Esta disciplina não pertence à sua turma.' });
      }
    }

    // Incluir turmas vinculadas
    const turmasVinculadas = tdRepo.findByDisciplina(d.id);
    res.json({ disciplina: { ...d, total_turmas: turmasVinculadas.length } });
  } catch(e){ next(e); }
}

async function create(req, res, next) {
  try {
    const { nome, descricao, codigo, carga_horaria, professor_id } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório.' });
    // Admin pode atribuir a outro professor; professor usa o próprio id
    const profId = (req.user.perfil === 'admin' && professor_id) ? Number(professor_id) : req.user.id;
    const d = repo.create({ nome, descricao, codigo, carga_horaria: carga_horaria||60, professor_id: profId });
    res.status(201).json({ disciplina: d });
  } catch(e){ next(e); }
}

async function update(req, res, next) {
  try {
    const d = repo.update(req.params.id, req.body);
    if (!d) return res.status(404).json({ error: 'Disciplina não encontrada.' });
    res.json({ disciplina: d });
  } catch(e){ next(e); }
}

async function remove(req, res, next) {
  try {
    // Remover vínculos com turmas antes de deletar
    tdRepo.findByDisciplina(req.params.id).forEach(td => tdRepo.desvincular(td.turma_id, req.params.id));
    repo.remove(req.params.id);
    res.json({ message: 'Disciplina removida.' });
  } catch(e){ next(e); }
}


// ── Módulo Completo da Disciplina ────────────────────────────
async function getModulo(req, res, next) {
  try {
    const discId = Number(req.params.id);
    const d = repo.findById(discId);
    if (!d) return res.status(404).json({ error: 'Disciplina não encontrada.' });

    // Aluno só acessa disciplinas da sua turma
    if (req.user.perfil === 'aluno') {
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      const discIds  = tdRepo.disciplinaIdsDoAluno(turmaIds);
      if (!discIds.includes(d.id)) return res.status(403).json({ error: 'Acesso negado.' });
    }

    // Professor (info + foto/bio)
    const prof = d.professor_id ? userRepo.findById(d.professor_id) : null;
    const professor = prof ? {
      id: prof.id, nome: prof.nome, email: prof.email,
      bio: d.professor_bio || '',
      foto: d.professor_foto || null,
    } : null;

    // Materiais por tipo
    const todosMateriaisBrut = (materialRepo.findByDisciplina ? materialRepo.findByDisciplina(discId) : [])
      || [];
    const materiais = todosMateriaisBrut.filter(m => m.tipo !== 'youtube');
    const videoaulas = todosMateriaisBrut.filter(m => m.tipo === 'youtube');

    // Trilhas com progresso do aluno
    const trilhas = (trilhaRepo.findByDisciplina(discId)||[]).map(t => {
      const qs = questaoRepo.findByTrilha(t.id) || [];
      let progresso = 0;
      if (req.user.perfil === 'aluno' && qs.length > 0) {
        const resps = (respostaRepo.findByAlunoTrilha
          ? respostaRepo.findByAlunoTrilha(req.user.id, t.id)
          : respostaRepo.findByAluno(req.user.id).filter(r => {
              const q = questaoRepo.findById(r.questao_id);
              return q && q.trilha_id === t.id;
            })
        ) || [];
        progresso = Math.min(100, Math.round(resps.length / qs.length * 100));
      }
      return { id:t.id, nome:t.nome, descricao:t.descricao||'', nivel:t.nivel,
        total_questoes: qs.length, progresso, ordem: t.ordem||0 };
    }).sort((a,b) => a.ordem - b.ordem);

    // Avaliações (filtradas por turma do aluno ou todas para prof)
    let avaliacoes = [];
    try {
      if (req.user.perfil === 'aluno') {
        const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
        avaliacoes = turmaIds.flatMap(tid => avaliacaoRepo.findByTurma(tid)||[])
          .filter(av => av.disciplina_id === discId || !av.disciplina_id)
          .filter(av => av.status === 'publicada');
      } else {
        avaliacoes = (avaliacaoRepo.findByDisciplina ? avaliacaoRepo.findByDisciplina(discId) : []) || [];
      }
    } catch(e) { avaliacoes = []; }

    // Atividades
    let atividades = [];
    try {
      atividades = (atividadeRepo.findByDisciplina ? atividadeRepo.findByDisciplina(discId)
        : atividadeRepo.findAll ? atividadeRepo.findAll().filter(a => a.disciplina_id === discId)
        : []) || [];
      if (req.user.perfil === 'aluno') {
        atividades = atividades.filter(a => a.status === 'publicada' || a.visivel);
      }
    } catch(e) { atividades = []; }

    // Turmas vinculadas
    const turmasVinculadas = (tdRepo.findByDisciplina(discId)||[]).map(td => {
      const t = turmaRepo.findById(td.turma_id);
      return t ? { id:t.id, nome:t.nome } : null;
    }).filter(Boolean);

    res.json({
      disciplina: {
        ...d,
        professor_foto: d.professor_foto || null,
        professor_bio:  d.professor_bio  || '',
        data_inicio:    d.data_inicio    || null,
        data_fim:       d.data_fim       || null,
        turno:          d.turno          || '',
        banner:         d.banner         || null,
      },
      professor,
      materiais,
      videoaulas,
      trilhas,
      avaliacoes,
      atividades,
      turmas: turmasVinculadas,
      gerado_em: new Date().toISOString(),
    });
  } catch(e){ next(e); }
}

module.exports = { list, getById, create, update, remove, getModulo };
