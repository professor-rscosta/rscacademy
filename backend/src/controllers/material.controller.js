/**
 * Material + Aviso Controller — RBAC completo
 * ALUNO: vê apenas materiais/avisos das disciplinas/turmas da sua turma
 * PROFESSOR/ADMIN: CRUD completo
 */
const materialRepo = require('../repositories/material.repository');
const turmaRepo    = require('../repositories/turma.repository');
const tdRepo       = require('../repositories/turma_disciplina.repository');
const avisoRepo    = require('../repositories/aviso.repository');

// ════════════════════════════════════════════════════════
// MATERIAIS
// ════════════════════════════════════════════════════════

async function listMateriais(req, res, next) {
  try {
    const { disciplina_id, professor_id } = req.query;
    let items;

    if (req.user.perfil === 'aluno') {
      // Aluno: apenas materiais das disciplinas da sua turma
      const turmaIds = (await turmaRepo.getTurmasAluno(req.user.id)).map(m => m.turma_id);
      if (!turmaIds.length) return res.json({ materiais: [] });
      const discIds = await tdRepo.disciplinaIdsDoAluno(turmaIds);
      items = (await Promise.all(discIds.map(async did => materialRepo.findByDisciplina(did)))).flat();
    } else if (disciplina_id) {
      items = await materialRepo.findByDisciplina(disciplina_id);
    } else if (professor_id) {
      items = await materialRepo.findByProfessor(professor_id);
    } else if (req.user.perfil === 'professor') {
      items = await materialRepo.findByProfessor(req.user.id);
    } else {
      items = await materialRepo.findAll();
    }

    res.json({ materiais: items });
  } catch(e){ next(e); }
}

async function getMaterial(req, res, next) {
  try {
    const m = await materialRepo.findById(req.params.id);
    if (!m) return res.status(404).json({ error: 'Material não encontrado.' });

    if (req.user.perfil === 'aluno') {
      const turmaIds = (await turmaRepo.getTurmasAluno(req.user.id)).map(t => t.turma_id);
      const discIds  = await tdRepo.disciplinaIdsDoAluno(turmaIds);
      if (!discIds.includes(m.disciplina_id))
        return res.status(403).json({ error: 'Material não pertence à sua turma.' });
    }
    res.json({ material: m });
  } catch(e){ next(e); }
}

async function createMaterial(req, res, next) {
  try {
    const { titulo, descricao, tipo, url, conteudo, disciplina_id } = req.body;
    if (!titulo || !disciplina_id) return res.status(400).json({ error: 'titulo e disciplina_id são obrigatórios.' });
    const m = await materialRepo.create({ titulo, descricao: descricao||'', tipo: tipo||'link', url: url||'', conteudo: conteudo||'', disciplina_id: Number(disciplina_id), professor_id: req.user.id });
    res.status(201).json({ material: m });
  } catch(e){ next(e); }
}

async function updateMaterial(req, res, next) {
  try {
    const m = await materialRepo.update(req.params.id, req.body);
    if (!m) return res.status(404).json({ error: 'Material não encontrado.' });
    res.json({ material: m });
  } catch(e){ next(e); }
}

async function deleteMaterial(req, res, next) {
  try { await materialRepo.remove(req.params.id); res.json({ message: 'Material removido.' }); }
  catch(e){ next(e); }
}

// ════════════════════════════════════════════════════════
// AVISOS
// ════════════════════════════════════════════════════════

async function listAvisos(req, res, next) {
  try {
    const { turma_id, professor_id } = req.query;
    let items;

    if (req.user.perfil === 'aluno') {
      // Aluno: avisos das turmas + avisos globais (turma_id=null)
      const mats = await turmaRepo.getTurmasAluno(req.user.id);
      const turmaIds = (mats || []).map(m => Number(m.turma_id));
      
      // Get avisos from enrolled turmas
      let turmaAvisos = [];
      if (turmaIds.length) {
        turmaAvisos = (await Promise.all(turmaIds.map(tid => avisoRepo.findByTurma(tid)))).flat();
      }
      
      // Also get global avisos (turma_id = null)
      const allAvisos = await avisoRepo.findAll();
      const globalAvisos = allAvisos.filter(a => !a.turma_id);
      
      // Merge, dedup, sort by date
      const seen = new Set();
      items = [...turmaAvisos, ...globalAvisos].filter(a => {
        if (!a || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (turma_id) {
      items = await avisoRepo.findByTurma(turma_id);
    } else if (professor_id) {
      items = await avisoRepo.findByProfessor(professor_id);
    } else if (req.user.perfil === 'professor') {
      items = await avisoRepo.findByProfessor(req.user.id);
    } else {
      items = await avisoRepo.findAll();
    }

    res.json({ avisos: items });
  } catch(e){ next(e); }
}

async function createAviso(req, res, next) {
  try {
    const { titulo, corpo, turma_id } = req.body;
    if (!titulo || !corpo) return res.status(400).json({ error: 'titulo e corpo são obrigatórios.' });

    if (req.user.perfil === 'professor' && turma_id) {
      const turma = await turmaRepo.findById(turma_id);
      if (turma && turma.professor_id !== req.user.id)
        return res.status(403).json({ error: 'Você não é o professor desta turma.' });
    }

    const a = await avisoRepo.create({ titulo, corpo, turma_id: turma_id ? Number(turma_id) : null, professor_id: req.user.id });
    res.status(201).json({ aviso: a });
  } catch(e){ next(e); }
}

async function deleteAviso(req, res, next) {
  try { await avisoRepo.remove(req.params.id); res.json({ message: 'Aviso removido.' }); }
  catch(e){ next(e); }
}

module.exports = { listMateriais, getMaterial, createMaterial, updateMaterial, deleteMaterial, listAvisos, createAviso, deleteAviso };
