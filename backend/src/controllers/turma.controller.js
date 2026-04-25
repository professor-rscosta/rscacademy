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
const adRepo    = require('../repositories/aluno_disciplina.repository');

// ── Helpers internos ────────────────────────────────────────
async function _turmaComDiscs(turma) {
  const discIds = await tdRepo.disciplinaIds(turma.id);
  const disciplinas = (await Promise.all(discIds.map(id => discRepo.findById(id)))).filter(Boolean);
  const alunos = await turmaRepo.getAlunos(turma.id);
  return { ...turma, disciplinas, total_alunos: alunos.length };
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
      const mats = await turmaRepo.getTurmasAluno(req.user.id);
      turmas = (await Promise.all(mats.map(m => turmaRepo.findById(m.turma_id)))).filter(Boolean);
    } else if (professor_id) {
      turmas = await turmaRepo.findByProfessor(professor_id);
    } else if (disciplina_id) {
      turmas = await turmaRepo.findByDisciplina(disciplina_id);
    } else if (req.user.perfil === 'professor') {
      turmas = await turmaRepo.findByProfessor(req.user.id);
    } else {
      turmas = await turmaRepo.findAll();
    }

    res.json({ turmas: await Promise.all(turmas.map(_turmaComDiscs)) });
  } catch(e){ next(e); }
}

// ── DETALHE turma (com alunos + disciplinas vinculadas) ────────
async function getById(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });

    if (req.user.perfil === 'aluno') {
      if (!await turmaRepo.jaMatriculado(req.user.id, t.id))
        return res.status(403).json({ error: 'Você não está matriculado nesta turma.' });
    }

    const _mats = await turmaRepo.getAlunos(t.id);
    const _alunosBrut = await Promise.all(_mats.map(async mat => {
      const u = await userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const { senha_hash, ...safe } = u;
      return { ...safe, joined_at: mat.created_at };
    }));
    const alunos = _alunosBrut.filter(Boolean);

    const discIds = await tdRepo.disciplinaIds(t.id);
    const _discBrut = await Promise.all(discIds.map(id => discRepo.findById(id)));
    const disciplinas = await Promise.all(
      _discBrut.filter(Boolean).map(async d => ({
        ...d,
        trilhas: (await trilhaRepo.findByDisciplina(d.id)).length,
      }))
    );

    // Disciplinas disponíveis para vincular (do professor)
    const todasDiscs = req.user.perfil === 'admin'
      ? await discRepo.findAll()
      : await discRepo.findByProfessor(t.professor_id);
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
    while (await turmaRepo.findByCodigo(codigo)) codigo = gerarCodigo(6);
    const t = await turmaRepo.create({ nome, descricao: descricao||'', professor_id: req.user.id, codigo_acesso: codigo, ativo: true });
    res.status(201).json({ turma: { ...t, disciplinas: [], total_alunos: 0 } });
  } catch(e){ next(e); }
}

// ── EDITAR turma ──────────────────────────────────────────────
async function update(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });
    const updated = await turmaRepo.update(req.params.id, req.body);
    res.json({ turma: _turmaComDiscs(updated) });
  } catch(e){ next(e); }
}

// ── REMOVER turma ─────────────────────────────────────────────
async function remove(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });
    await tdRepo.limparTurma(req.params.id);
    await turmaRepo.remove(req.params.id);
    res.json({ message: 'Turma removida.' });
  } catch(e){ next(e); }
}

// ════════════════════════════════════════════════════════════════
// DISCIPLINAS DA TURMA
// ════════════════════════════════════════════════════════════════

// ── Listar disciplinas vinculadas à turma ─────────────────────
async function listDisciplinas(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });

    if (req.user.perfil === 'aluno' && !await turmaRepo.jaMatriculado(req.user.id, t.id))
      return res.status(403).json({ error: 'Você não está matriculado nesta turma.' });

    const discIds = await tdRepo.disciplinaIds(t.id);
    const _discList = (await Promise.all(discIds.map(id => discRepo.findById(id)))).filter(Boolean);
    const disciplinas = await Promise.all(_discList.map(async d => ({
      ...d,
      total_trilhas: (await trilhaRepo.findByDisciplina(d.id)).length,
    })));

    res.json({ disciplinas });
  } catch(e){ next(e); }
}

// ── Vincular disciplina à turma (PROF da turma ou ADMIN) ──────
async function vincularDisciplina(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });

    const { disciplina_id } = req.body;
    if (!disciplina_id) return res.status(400).json({ error: 'disciplina_id é obrigatório.' });

    const disc = await discRepo.findById(disciplina_id);
    if (!disc) return res.status(404).json({ error: 'Disciplina não encontrada.' });

    if (await tdRepo.jaVinculada(t.id, disciplina_id))
      return res.status(409).json({ error: 'Disciplina já vinculada a esta turma.' });

    await tdRepo.vincular(t.id, disciplina_id);
    res.status(201).json({
      message: `Disciplina "${disc.nome}" vinculada à turma "${t.nome}".`,
      disciplina: { ...disc, total_trilhas: (await trilhaRepo.findByDisciplina(disc.id)).length },
    });
  } catch(e){ next(e); }
}

// ── Desvincular disciplina da turma ───────────────────────────
async function desvincularDisciplina(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    const err = _checkDono(req, t);
    if (err) return res.status(err.includes('não encontrada') ? 404 : 403).json({ error: err });

    const { disciplina_id } = req.params;
    await tdRepo.desvincular(t.id, disciplina_id);
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
    const u = await userRepo.findByEmail(email.trim().toLowerCase());
    if (!u || u.perfil !== 'aluno') return res.status(404).json({ error: 'Aluno não encontrado.' });
    const { senha_hash, ...safe } = u;
    const _mats = await turmaRepo.getTurmasAluno(u.id);
    const _turmasBrut = await Promise.all(_mats.map(m => turmaRepo.findById(m.turma_id)));
    const turmasAluno = _turmasBrut.filter(Boolean);
    res.json({ aluno: safe, turmas: turmasAluno });
  } catch(e){ next(e); }
}

// ── Matricular aluno na turma ─────────────────────────────────
async function matricularAluno(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err && req.user.perfil !== 'admin') return res.status(403).json({ error: err });

    const { aluno_id, email } = req.body;
    let aluno = aluno_id ? await userRepo.findById(aluno_id) : email ? await userRepo.findByEmail(email) : null;
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    if (aluno.perfil !== 'aluno') return res.status(400).json({ error: 'Usuário não é aluno.' });
    if (aluno.status !== 'ativo') return res.status(400).json({ error: 'Aluno não está ativo.' });

    // Regra: 1 turma ativa por aluno
    const _mats2 = await turmaRepo.getTurmasAluno(aluno.id);
    const _turmasBrut2 = await Promise.all(_mats2.map(m => turmaRepo.findById(m.turma_id)));
    const turmasAtivas = _turmasBrut2.filter(t => t?.ativo);
    if (turmasAtivas.length > 0)
      return res.status(409).json({
        error: `Aluno já está matriculado em "${turmasAtivas[0].nome}". Remova-o primeiro.`,
        turma_atual: turmasAtivas[0],
      });

    if (await turmaRepo.jaMatriculado(aluno.id, t.id))
      return res.status(409).json({ error: 'Aluno já matriculado nesta turma.' });

    await turmaRepo.matricular(aluno.id, t.id);
    const { senha_hash, ...safeAluno } = aluno;
    res.status(201).json({ message: `"${aluno.nome}" matriculado com sucesso!`, aluno: safeAluno });
  } catch(e){ next(e); }
}

// ── Desmatricular aluno da turma ──────────────────────────────
async function removerAluno(req, res, next) {
  try {
    const { turma_id, aluno_id } = req.params;
    const t = await turmaRepo.findById(turma_id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err) return res.status(403).json({ error: err });
    await turmaRepo.desmatricular(aluno_id, turma_id);
    res.json({ message: 'Aluno removido da turma.' });
  } catch(e){ next(e); }
}

// ── Minhas turmas (aluno logado) ──────────────────────────────
async function minhasTurmas(req, res, next) {
  try {
    const mats = await turmaRepo.getTurmasAluno(req.user.id);
    const turmas = (await Promise.all(mats.map(async m => {

      const t = await turmaRepo.findById(m.turma_id);
      if (!t) return null;
      const discIds = await tdRepo.disciplinaIds(t.id);
      const disciplinas = (await Promise.all(discIds.map(id => discRepo.findById(id)))).filter(Boolean);
      return { ...t, joined_at: m.joined_at, disciplinas };
    
}))).filter(Boolean);
    res.json({ turmas });
  } catch(e){ next(e); }
}


// ── Listar todos os alunos ativos (para seleção múltipla) ────
async function listarTodosAlunos(req, res, next) {
  try {
    const { busca, turma_id } = req.query;
    const todos = await userRepo.findAll();
    let alunos = todos.filter(u => u.perfil === 'aluno' && u.status === 'ativo');

    if (busca?.trim()) {
      const q = busca.trim().toLowerCase();
      alunos = alunos.filter(u =>
        (u.nome||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
      );
    }

    // Marcar quais já estão nesta turma
    const jaMatriculados = new Set();
    if (turma_id) {
      const mats = await turmaRepo.getAlunos(Number(turma_id));
      mats.forEach(m => jaMatriculados.add(m.aluno_id));
    }

    const result = await Promise.all(alunos.map(async u => {
      const { senha_hash, ...safe } = u;
      let turma_atual = null;
      try {
        const mats = await turmaRepo.getTurmasAluno(u.id);
        const turmasBrut = await Promise.all(mats.map(m => turmaRepo.findById(m.turma_id)));
        const turmasAtivas = turmasBrut.filter(t => t?.ativo);
        turma_atual = turmasAtivas[0]?.nome || null;
      } catch(_) {}
      return {
        ...safe,
        ja_nesta_turma: jaMatriculados.has(u.id),
        turma_atual,
      };
    }));

    res.json({ alunos: result, total: result.length });
  } catch(e){ next(e); }
}

// ── Matricular múltiplos alunos de uma vez ───────────────────
async function matricularLote(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err && req.user.perfil !== 'admin') return res.status(403).json({ error: err });

    const { aluno_ids } = req.body;
    if (!Array.isArray(aluno_ids) || aluno_ids.length === 0)
      return res.status(400).json({ error: 'aluno_ids é obrigatório.' });

    const resultados = { matriculados: [], ja_matriculados: [], erros: [] };

    for (const aid of aluno_ids) {
      const aluno = await userRepo.findById(aid);
      if (!aluno || aluno.perfil !== 'aluno') {
        resultados.erros.push({ id: aid, msg: 'Aluno não encontrado.' });
        continue;
      }
      if (await turmaRepo.jaMatriculado(aluno.id, t.id)) {
        resultados.ja_matriculados.push(aluno.nome);
        continue;
      }
      // Regra: 1 turma ativa por aluno
      const _mats = await turmaRepo.getTurmasAluno(aluno.id);
      const _tBrut = await Promise.all(_mats.map(m => turmaRepo.findById(m.turma_id)));
      const turmasAtivas = _tBrut.filter(ta => ta?.ativo);
      if (turmasAtivas.length > 0) {
        resultados.erros.push({ id: aid, nome: aluno.nome, msg: `Já em "${turmasAtivas[0].nome}"` });
        continue;
      }
      await turmaRepo.matricular(aluno.id, t.id);
      resultados.matriculados.push(aluno.nome);
    }

    let msg = '';
    if (resultados.matriculados.length > 0) msg += `✅ ${resultados.matriculados.length} aluno(s) matriculado(s). `;
    if (resultados.ja_matriculados.length > 0) msg += `⚠️ ${resultados.ja_matriculados.length} já estavam matriculados. `;
    if (resultados.erros.length > 0) msg += `❌ ${resultados.erros.length} com erro.`;

    res.status(201).json({ message: msg.trim(), ...resultados });
  } catch(e){ next(e); }
}


// ── Matricular lote em disciplinas específicas ─────────────
async function matricularNasDisciplinas(req, res, next) {
  try {
    const t = await turmaRepo.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err && req.user.perfil !== 'admin') return res.status(403).json({ error: err });

    const { aluno_ids, disciplina_ids } = req.body;
    if (!Array.isArray(aluno_ids) || aluno_ids.length === 0)
      return res.status(400).json({ error: 'aluno_ids é obrigatório.' });
    if (!Array.isArray(disciplina_ids) || disciplina_ids.length === 0)
      return res.status(400).json({ error: 'Selecione ao menos uma disciplina.' });

    // Verificar que as disciplinas pertencem à turma
    const discsDaTurma = await tdRepo.disciplinaIds(t.id);
    const discsInvalidas = disciplina_ids.filter(d => !discsDaTurma.includes(Number(d)));
    if (discsInvalidas.length > 0)
      return res.status(400).json({ error: 'Uma ou mais disciplinas não pertencem a esta turma.' });

    const resultados = { matriculados: [], ja_matriculados: [], erros: [] };

    for (const aid of aluno_ids) {
      const aluno = await userRepo.findById(aid);
      if (!aluno || aluno.perfil !== 'aluno') {
        resultados.erros.push({ id: aid, msg: 'Aluno não encontrado.' });
        continue;
      }

      // Matricular na turma se ainda não estiver
      if (!await turmaRepo.jaMatriculado(aluno.id, t.id)) {
        // Verificar regra: 1 turma ativa por aluno
        const _mats3 = await turmaRepo.getTurmasAluno(aluno.id);
        const _tBrut3 = await Promise.all(_mats3.map(m => turmaRepo.findById(m.turma_id)));
        const turmasAtivas = _tBrut3.filter(ta => ta?.ativo);
        if (turmasAtivas.length > 0) {
          resultados.erros.push({ id: aid, nome: aluno.nome, msg: `Já em outra turma: "${turmasAtivas[0].nome}"` });
          continue;
        }
        await turmaRepo.matricular(aluno.id, t.id);
      }

      // Matricular em cada disciplina selecionada
      let algumaNova = false;
      for (const did of disciplina_ids) {
        if (!await adRepo.jaMatriculado(aluno.id, did, t.id)) {
          await adRepo.matricular(aluno.id, did, t.id);
          algumaNova = true;
        }
      }

      if (algumaNova) resultados.matriculados.push(aluno.nome);
      else resultados.ja_matriculados.push(aluno.nome);
    }

    let msg = '';
    if (resultados.matriculados.length > 0)    msg += `✅ ${resultados.matriculados.length} aluno(s) matriculado(s). `;
    if (resultados.ja_matriculados.length > 0)  msg += `⚠️ ${resultados.ja_matriculados.length} já matriculado(s). `;
    if (resultados.erros.length > 0)            msg += `❌ ${resultados.erros.length} com erro.`;

    res.status(201).json({ message: msg.trim(), ...resultados });
  } catch(e){ next(e); }
}

// ── Listar disciplinas de um aluno em uma turma ─────────────
async function disciplinasDoAlunoNaTurma(req, res, next) {
  try {
    const { aluno_id, turma_id } = req.params;
    const vinculos = await adRepo.findByAlunoTurma(aluno_id, turma_id);
    const discList = await Promise.all(vinculos.map(v => discRepo.findById(v.disciplina_id)));
    const disciplinas = discList.map((d, i) => d ? { ...d, enrolled_at: vinculos[i]?.created_at } : null).filter(Boolean);
    res.json({ disciplinas, total: disciplinas.length });
  } catch(e){ next(e); }
}

// ── Desmatricular aluno de disciplina específica ───────────
async function desmatricularDaDisciplina(req, res, next) {
  try {
    const { turma_id, aluno_id, disciplina_id } = req.params;
    const t = await turmaRepo.findById(turma_id);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const err = _checkDono(req, t);
    if (err && req.user.perfil !== 'admin') return res.status(403).json({ error: err });

    await adRepo.desmatricular(aluno_id, disciplina_id, turma_id);

    // Se não tem mais disciplinas nesta turma, remove da turma também
    const resto = await adRepo.findByAlunoTurma(aluno_id, turma_id);
    if (resto.length === 0) {
      await turmaRepo.desmatricular(aluno_id, turma_id);
    }

    res.json({ message: 'Desmatriculado da disciplina com sucesso.' });
  } catch(e){ next(e); }
}

module.exports = { listarTodosAlunos, matricularLote, matricularNasDisciplinas, disciplinasDoAlunoNaTurma, desmatricularDaDisciplina,
  list, getById, create, update, remove,
  listDisciplinas, vincularDisciplina, desvincularDisciplina,
  buscarAluno, matricularAluno, removerAluno,
  minhasTurmas,
};
