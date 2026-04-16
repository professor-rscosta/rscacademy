const questaoRepo  = require('../repositories/questao.repository');
const trilhaRepo   = require('../repositories/trilha.repository');
const aiService    = require('../services/ai.service');
const ragService   = require('../services/rag.service');
const triService   = require('../services/tri.service');
const { generateCurvePoints } = require('../services/tri.service');

// ─── CRUD ─────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const { trilha_id, professor_id, disciplina_id, tipo_uso } = req.query;
    let questoes;
    if (trilha_id)       questoes = questaoRepo.findByTrilha(trilha_id);
    else if (disciplina_id) questoes = questaoRepo.findByDisciplina ? questaoRepo.findByDisciplina(disciplina_id) : questaoRepo.findAll().filter(q=>String(q.disciplina_id)===String(disciplina_id));
    else if (professor_id)  questoes = questaoRepo.findByProfessor(professor_id);
    else                    questoes = questaoRepo.findAll();
    if (tipo_uso) questoes = questoes.filter(q => q.tipo_uso === tipo_uso || q.tipo_uso === 'ambos' || (!q.tipo_uso && tipo_uso === 'trilha'));
    else questoes = questaoRepo.findAll();
    // Remove senha_hash se vier por join
    res.json({ questoes, total: questoes.length });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const q = questaoRepo.findById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Questão não encontrada.' });
    res.json({ questao: q });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { trilha_id, tipo, enunciado, alternativas, gabarito, xp, tri, rag_tags, midias,
            disciplina_id, tipo_uso, nivel, instrucoes_extras, dica, explicacao } = req.body;
    if (!tipo || !enunciado) return res.status(400).json({ error: 'tipo e enunciado são obrigatórios.' });

    const modoUso = tipo_uso || (trilha_id ? 'trilha' : 'banco');

    // Validar trilha se for modo trilha
    let trilha = null;
    if (trilha_id) {
      trilha = trilhaRepo.findById(trilha_id);
      if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });
    } else if (modoUso === 'trilha') {
      return res.status(400).json({ error: 'trilha_id é obrigatório para questões de trilha.' });
    }

    const questao = questaoRepo.create({
      trilha_id: trilha_id ? Number(trilha_id) : null,
      disciplina_id: disciplina_id ? Number(disciplina_id) : null,
      tipo_uso: modoUso,
      nivel: nivel || 'intermediário',
      dica: dica || null,
      explicacao: explicacao || null,
      instrucoes_extras: instrucoes_extras || null,
      professor_id: req.user.id,
      tipo, enunciado, alternativas: alternativas || null,
      gabarito, xp: xp || 100, ativo: true,
      tri: tri || { modelo:'2PL', a:1.0, b:0.0, c:0, status:'provisorio', total_respostas:0 },
      rag_tags: rag_tags || [],
      midias: midias || [],
    });
    res.status(201).json({ questao });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const fields = req.body;
    const q = questaoRepo.update(req.params.id, fields);
    if (!q) return res.status(404).json({ error: 'Questão não encontrada.' });
    res.json({ questao: q });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    questaoRepo.remove(req.params.id);
    res.json({ message: 'Questão desativada.' });
  } catch (err) { next(err); }
}

// ─── IA: Gerar questão completa ──────────────────────────────

async function gerarComIA(req, res, next) {
  try {
    const { tipo, topico, nivel, trilha_id, instrucoes_extras, tags } = req.body;
    if (!tipo || !topico) return res.status(400).json({ error: 'tipo e topico são obrigatórios.' });

    const result = await aiService.generateQuestion({ tipo, topico, nivel, instrucoes_extras, tags: tags || [] });
    res.json({ questao_sugerida: result });
  } catch (err) {
    if (err.message.includes('ANTHROPIC_API_KEY')) return res.status(503).json({ error: err.message });
    next(err);
  }
}

// ─── IA: Sugerir parâmetros TRI ──────────────────────────────

async function sugerirTRI(req, res, next) {
  try {
    const { tipo, enunciado, alternativas, gabarito, nivel_esperado } = req.body;
    if (!tipo || !enunciado) return res.status(400).json({ error: 'tipo e enunciado são obrigatórios.' });

    const sugestao = await aiService.suggestTRIParams({ tipo, enunciado, alternativas, gabarito, nivel_esperado });

    // Adicionar pontos da curva calculados pelo triService para consistência
    const curvaCalculada = generateCurvePoints(sugestao, [-4, 4], 60);
    res.json({ sugestao: { ...sugestao, curva_calculada: curvaCalculada } });
  } catch (err) {
    if (err.message.includes('ANTHROPIC_API_KEY')) return res.status(503).json({ error: err.message });
    next(err);
  }
}

// ─── Curva TRI para uma questão ──────────────────────────────

async function getCurva(req, res, next) {
  try {
    const q = questaoRepo.findById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Questão não encontrada.' });
    const pontos = generateCurvePoints(q.tri);
    res.json({ pontos, tri: q.tri });
  } catch (err) { next(err); }
}

// ─── RAG: adicionar contexto ──────────────────────────────────

async function addRagContext(req, res, next) {
  try {
    const { titulo, conteudo, tags } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ error: 'titulo e conteudo são obrigatórios.' });
    const ctx = ragService.addContext({ titulo, conteudo, tags });
    res.status(201).json({ contexto: ctx });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, gerarComIA, sugerirTRI, getCurva, addRagContext };
