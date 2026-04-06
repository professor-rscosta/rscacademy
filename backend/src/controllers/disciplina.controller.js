/**
 * Disciplina Controller — com filtro RBAC
 *
 * Fluxo:
 *   ALUNO → vê apenas disciplinas das suas turmas (via turma_disciplinas)
 *   PROFESSOR → vê suas próprias disciplinas
 *   ADMIN → vê todas
 */
const repo      = require('../repositories/disciplina.repository');
const turmaRepo = require('../repositories/turma.repository');
const tdRepo    = require('../repositories/turma_disciplina.repository');
const userRepo  = require('../repositories/user.repository');

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
    const { nome, descricao, codigo, carga_horaria } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório.' });
    const d = repo.create({ nome, descricao, codigo, carga_horaria: carga_horaria||60, professor_id: req.user.id });
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

module.exports = { list, getById, create, update, remove };
