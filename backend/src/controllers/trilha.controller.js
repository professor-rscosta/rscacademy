/**
 * Trilha Controller — RBAC completo
 *
 * ALUNO: vê apenas trilhas das disciplinas da sua turma
 * PROFESSOR: vê suas trilhas
 * ADMIN: vê todas
 */
const trilhaRepo = require('../repositories/trilha.repository');
const questaoRepo = require('../repositories/questao.repository');
const turmaRepo   = require('../repositories/turma.repository');
const tdRepo      = require('../repositories/turma_disciplina.repository');

async function list(req, res, next) {
  try {
    const { disciplina_id, professor_id } = req.query;
    let trilhas;

    if (req.user.perfil === 'aluno') {
      // Aluno: apenas trilhas das disciplinas da sua turma
      const turmaIds = (await turmaRepo.getTurmasAluno(req.user.id)).map(m => m.turma_id);
      if (turmaIds.length === 0) return res.json({ trilhas: [] });
      const discIds = await tdRepo.disciplinaIdsDoAluno(turmaIds);
      if (discIds.length === 0) return res.json({ trilhas: [] });
      trilhas = (await Promise.all(discIds.map(did => trilhaRepo.findByDisciplina(did)))).flat();
    } else if (disciplina_id) {
      trilhas = await trilhaRepo.findByDisciplina(disciplina_id);
    } else if (professor_id) {
      trilhas = await trilhaRepo.findByProfessor(professor_id);
    } else if (req.user.perfil === 'professor') {
      trilhas = await trilhaRepo.findByProfessor(req.user.id);
    } else {
      trilhas = await trilhaRepo.findAll();
    }

    res.json({ trilhas });
  } catch(e){ next(e); }
}

async function getById(req, res, next) {
  try {
    const t = await trilhaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Trilha não encontrada.' });

    // Aluno: verificar se a trilha pertence a uma disciplina da sua turma
    if (req.user.perfil === 'aluno') {
      const turmaIds = (await turmaRepo.getTurmasAluno(req.user.id)).map(m => m.turma_id);
      const discIds  = await tdRepo.disciplinaIdsDoAluno(turmaIds);
      if (!discIds.includes(t.disciplina_id)) {
        return res.status(403).json({ error: 'Esta trilha não pertence à sua turma.' });
      }
    }

    const questoes = await questaoRepo.findByTrilha(t.id);
    res.json({ trilha: { ...t, total_questoes: questoes.length } });
  } catch(e){ next(e); }
}

async function create(req, res, next) {
  try {
    const { nome, descricao, disciplina_id, ordem, xp_total, tempo_limite, tentativas_maximas } = req.body;
    if (!nome || !disciplina_id) return res.status(400).json({ error: 'nome e disciplina_id são obrigatórios.' });
    const trilhaData = {
      nome, descricao, disciplina_id: Number(disciplina_id),
      professor_id: req.user.id, ordem: ordem||1, xp_total: xp_total||500, ativo: true,
    };
    if (tempo_limite) trilhaData.tempo_limite = Number(tempo_limite);
    if (tentativas_maximas) trilhaData.tentativas_maximas = Number(tentativas_maximas);
    const t = await trilhaRepo.create(trilhaData);
    res.status(201).json({ trilha: t });
  } catch(e){ next(e); }
}

async function update(req, res, next) {
  try {
    const t = await trilhaRepo.update(req.params.id, req.body);
    if (!t) return res.status(404).json({ error: 'Trilha não encontrada.' });
    res.json({ trilha: t });
  } catch(e){ next(e); }
}

async function remove(req, res, next) {
  try { await trilhaRepo.remove(req.params.id); res.json({ message: 'Trilha removida.' }); }
  catch(e){ next(e); }
}

module.exports = { list, getById, create, update, remove };
