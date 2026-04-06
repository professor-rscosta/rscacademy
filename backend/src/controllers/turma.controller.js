/**
 * Turma Controller — fluxo completo Turma→Disciplina→Trilha
 *
 * ADMIN: acesso total
 * PROFESSOR: somente suas turmas; matricula/desmatricula alunos e disciplinas
 * ALUNO: somente leitura das suas turmas e disciplinas vinculadas
 */
const turmaRepo = require('../repositories/turma.repository');
const userRepo  = require('../repositories/user.repository');
const discRepo  = require('../repositories/disciplina.repository');
const tdRepo    = require('../repositories/turma_disciplina.repository');
const trilhaRepo = require('../repositories/trilha.repository');
const { gerarCodigo } = require('../database/init');

// ── Helpers internos ────────────────────────────────────────
function _turmaComDiscs(turma) {
  const discIds = tdRepo.disciplinaIds(turma.id);
  const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean);
  return { ...turma, disciplinas, total_alunos: turmaRepo.getAlunos(turma.id).length };
}

function _checkDono(req, turma) {
  if (req.user.perfil === 'admin') return null;
  if (!turma) return 'Turma não encontrada.';
  if (turma.professor_id !== req.user.id) return 'Acesso negado. Você não é o professor desta turma.';
  return null;
}

// ── LISTAR turmas ─────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { professor_id, disciplina_id } = req.query;
    let turmas;

    if (req.user.perfil === 'aluno') {
      const mats = turmaRepo.getTurmasAluno(req.user.id);
      turmas = mats.map(m => turmaRepo.findById(m.turma_id)).filter(Boolean);
    } else if (professor_id) {
      turmas = turmaRepo.findByProfessor(professor_id);
    } else if (disciplina_id) {
      turmas = turmaRepo.findByDisciplina(disciplina_id);
    } else if (req.user.perfil === 'professor') {
      turmas = turmaRepo.findByProfessor(req.user.id);
    } else {
      turmas = turmaRepo.findAll();
    }

    res.json({ turmas: turmas.map(_turmaComDiscs) });
  } catch(e){ next(e); }
}

// ── DETALHE turma (com alunos + disciplinas vinculadas) ────────
async function getById(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });

    if (req.user.perfil === 'aluno') {
      if (!turmaRepo.jaMatriculado(req.user.id, t.id))
        return res.status(403).json({ error: 'Você não está matriculado nesta turma.' });
    }

    const alunos = turmaRepo.getAlunos(t.id).map(mat => {
      const u = userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const { senha_hash, ...safe } = u;
      return { ...safe, joined_at: mat.joined_at };
    }).filter(Boolean);

    const discIds = tdRepo.disciplinaIds(t.id);
    const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean)
      .map(d => ({ ...d, trilhas: trilhaRepo.findByDisciplina(d.id).length }));

    // Disciplinas disponíveis para vincular (do professor)
    const todasDiscs = req.user.perfil === 'admin'
      ? discRepo.findAll()
      : discRepo.findByProfessor(t.professor_id);
    const disponiveisParaVincular = todasDiscs.filter(d => !discIds.includes(d.id));

    res.json({ turma: { ...t, alunos, total_alunos: alunos.length, disciplinas, disponiveisParaVincular } });
  } catch(e){ next(e); }
}

// ── CRIAR turma ───────────────────────────────────────────────
async function create(req, res, next) {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório.' });
    let codigo = gerarCodigo(6);
    while (turmaRepo.findByCodigo(codigo)) codigo = gerarCodigo(6);
    const t = turmaRepo.create({ nome, descricao: descricao||'', professor_id: req.user.id, codigo_acesso: codigo, ativo: true });
    res.status(201).json({ turma: { ...t, disciplinas: [], total_alunos: 0 } });
  } catch(e){ next(e); }
}

// ── EDITAR turma ──────────────────────────────────────────────
async function update(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });
    const updated = turmaRepo.update(req.params.id, req.body);
    res.json({ turma: _turmaComDiscs(updated) });
  } catch(e){ next(e); }
}

// ── REMOVER turma ─────────────────────────────────────────────
async function remove(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });
    tdRepo.limparTurma(req.params.id);
    turmaRepo.remove(req.params.id);
    res.json({ message: 'Turma removida.' });
  } catch(e){ next(e); }
}

// ════════════════════════════════════════════════════════════════
// DISCIPLINAS DA TURMA
// ════════════════════════════════════════════════════════════════

// ── Listar disciplinas vinculadas à turma ─────────────────────
async function listDisciplinas(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });

    if (req.user.perfil === 'aluno' && !turmaRepo.jaMatriculado(req.user.id, t.id))
      return res.status(403).json({ error: 'Você não está matriculado nesta turma.' });

    const discIds = tdRepo.disciplinaIds(t.id);
    const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean)
      .map(d => ({
        ...d,
        total_trilhas: trilhaRepo.findByDisciplina(d.id).length,
      }));

    res.json({ disciplinas });
  } catch(e){ next(e); }
}

// ── Vincular disciplina à turma (PROF da turma ou ADMIN) ──────
async function vincularDisciplina(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });

    const { disciplina_id } = req.body;
    if (!disciplina_id) return res.status(400).json({ error: 'disciplina_id é obrigatório.' });

    const disc = discRepo.findById(disciplina_id);
    if (!disc) return res.status(404).json({ error: 'Disciplina não encontrada.' });

    if (tdRepo.jaVinculada(t.id, disciplina_id))
      return res.status(409).json({ error: 'Disciplina já vinculada a esta turma.' });

    tdRepo.vincular(t.id, disciplina_id);
    res.status(201).json({
      message: `Disciplina "${disc.nome}" vinculada à turma "${t.nome}".`,
      disciplina: { ...disc, total_trilhas: trilhaRepo.findByDisciplina(disc.id).length },
    });
  } catch(e){ next(e); }
}

// ── Desvincular disciplina da turma ───────────────────────────
async function desvincularDisciplina(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });

    const { disciplina_id } = req.params;
    tdRepo.desvincular(t.id, disciplina_id);
    res.json({ message: 'Disciplina desvinculada da turma.' });
  } catch(e){ next(e); }
}

// ════════════════════════════════════════════════════════════════
// ALUNOS DA TURMA
// ════════════════════════════════════════════════════════════════

// ── Buscar aluno por email (para professor matricular) ────────
async function buscarAluno(req, res, next) {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email é obrigatório.' });
    const u = userRepo.findByEmail(email.trim().toLowerCase());
    if (!u || u.perfil !== 'aluno') return res.status(404).json({ error: 'Aluno não encontrado.' });
    const { senha_hash, ...safe } = u;
    const turmasAluno = turmaRepo.getTurmasAluno(u.id)
      .map(m => turmaRepo.findById(m.turma_id)).filter(Boolean);
    res.json({ aluno: safe, turmas: turmasAluno });
  } catch(e){ next(e); }
}

// ── Matricular aluno na turma ─────────────────────────────────
async function matricularAluno(req, res, next) {
  try {
    const t = turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err && req.user.perfil !== 'admin') return res.status(403).json({ error: err });

    const { aluno_id, email } = req.body;
    let aluno = aluno_id ? userRepo.findById(aluno_id) : email ? userRepo.findByEmail(email) : null;
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    if (aluno.perfil !== 'aluno') return res.status(400).json({ error: 'Usuário não é aluno.' });
    if (aluno.status !== 'ativo') return res.status(400).json({ error: 'Aluno não está ativo.' });

    // Regra: 1 turma ativa por aluno
    const turmasAtivas = turmaRepo.getTurmasAluno(aluno.id)
      .map(m => turmaRepo.findById(m.turma_id)).filter(t => t?.ativo);
    if (turmasAtivas.length > 0)
      return res.status(409).json({
        error: `Aluno já está matriculado em "${turmasAtivas[0].nome}". Remova-o primeiro.`,
        turma_atual: turmasAtivas[0],
      });

    if (turmaRepo.jaMatriculado(aluno.id, t.id))
      return res.status(409).json({ error: 'Aluno já matriculado nesta turma.' });

    turmaRepo.matricular(aluno.id, t.id);
    const { senha_hash, ...safeAluno } = aluno;
    res.status(201).json({ message: `"${aluno.nome}" matriculado com sucesso!`, aluno: safeAluno });
  } catch(e){ next(e); }
}

// ── Desmatricular aluno da turma ──────────────────────────────
async function removerAluno(req, res, next) {
  try {
    const { turma_id, aluno_id } = req.params;
    const t = turmaRepo.findById(turma_id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err) return res.status(403).json({ error: err });
    turmaRepo.desmatricular(aluno_id, turma_id);
    res.json({ message: 'Aluno removido da turma.' });
  } catch(e){ next(e); }
}

// ── Minhas turmas (aluno logado) ──────────────────────────────
async function minhasTurmas(req, res, next) {
  try {
    const mats = turmaRepo.getTurmasAluno(req.user.id);
    const turmas = mats.map(m => {
      const t = turmaRepo.findById(m.turma_id);
      if (!t) return null;
      const discIds = tdRepo.disciplinaIds(t.id);
      const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean);
      return { ...t, joined_at: m.joined_at, disciplinas };
    }).filter(Boolean);
    res.json({ turmas });
  } catch(e){ next(e); }
}

module.exports = {
  list, getById, create, update, remove,
  listDisciplinas, vincularDisciplina, desvincularDisciplina,
  buscarAluno, matricularAluno, removerAluno,
  minhasTurmas,
};
