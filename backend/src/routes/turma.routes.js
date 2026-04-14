/**
 * Turma Routes — RBAC completo
 *
 * ALUNO   → GET apenas (somente suas turmas e disciplinas)
 * PROF    → CRUD das suas turmas + gerenciar disciplinas + matricular/desmatricular alunos
 * ADMIN   → tudo
 */
const r = require('express').Router();
const c = require('../controllers/turma.controller');
const { authenticate, profOuAdmin } = require('../middleware/auth.middleware');

r.use(authenticate);

// ── Consultas (todos autenticados, filtro por perfil no controller) ──
r.get('/',       c.list);
r.get('/minhas', c.minhasTurmas);
r.get('/:id',    c.getById);

// ── Disciplinas da turma ──────────────────────────────────────────────
r.get('/:id/disciplinas',                      c.listDisciplinas);
r.post('/:id/disciplinas',     profOuAdmin,    c.vincularDisciplina);
r.delete('/:id/disciplinas/:disciplina_id', profOuAdmin, c.desvincularDisciplina);

// ── CRUD de turma (prof/admin) ────────────────────────────────────────
r.post('/',           profOuAdmin, c.create);
r.put('/:id',         profOuAdmin, c.update);
r.delete('/:id',      profOuAdmin, c.remove);

// ── Alunos: buscar + matricular + desmatricular ───────────────────────
r.get('/buscar/aluno',                     profOuAdmin, c.buscarAluno);
r.get('/lista/alunos',                     profOuAdmin, c.listarTodosAlunos);
r.post('/:id/alunos/lote',                 profOuAdmin, c.matricularLote);
r.post('/:id/alunos/disciplinas',           profOuAdmin, c.matricularNasDisciplinas);
r.get( '/:turma_id/alunos/:aluno_id/disciplinas', profOuAdmin, c.disciplinasDoAlunoNaTurma);
r.delete('/:turma_id/alunos/:aluno_id/disciplinas/:disciplina_id', profOuAdmin, c.desmatricularDaDisciplina);
r.post('/:id/alunos',                      profOuAdmin, c.matricularAluno);
r.delete('/:turma_id/alunos/:aluno_id',    profOuAdmin, c.removerAluno);

module.exports = r;
