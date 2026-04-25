const respostaRepo   = require('../repositories/resposta.repository');
const questaoRepo    = require('../repositories/questao.repository');
const triService     = require('../services/tri.service');
const aiService      = require('../services/ai.service');
const { dbUpdate }   = require('../database/init');

// ─── Submeter resposta ────────────────────────────────────────

async function submitResposta(req, res, next) {
  try {
    const { questao_id, resposta, tempo_gasto_ms } = req.body;
    const aluno_id = req.user.id;

    if (!questao_id || resposta === undefined || resposta === null) {
      return res.status(400).json({ error: 'questao_id e resposta são obrigatórios.' });
    }

    // ── Buscar questão ─────────────────────────────────────────
    const questao = await questaoRepo.findById(questao_id);
    if (!questao) return res.status(404).json({ error: 'Questão não encontrada.' });

    // ── Normalizar resposta ────────────────────────────────────
    const respostaStr = typeof resposta === 'object'
      ? JSON.stringify(resposta)
      : String(resposta || '');

    // ── Normalizar gabarito ────────────────────────────────────
    let gabarito = questao.gabarito;
    if (typeof gabarito === 'string') {
      try { gabarito = JSON.parse(gabarito); } catch { /* keep as string */ }
    }

    // ── Calcular score ─────────────────────────────────────────
    let score = 0;
    let feedbackIA = null;

    if (questao.tipo === 'dissertativa' || questao.tipo === 'upload_arquivo') {
      try {
        const ai = await aiService.evaluateOpenAnswer({
          enunciado: questao.enunciado,
          gabarito_criterios: gabarito,
          resposta_aluno: respostaStr,
          tipo: questao.tipo,
        });
        score = ai.score || 0;
        feedbackIA = ai.feedback || null;
      } catch {
        score = 0.5;
        feedbackIA = '⏳ Aguardando correção manual.';
      }
    } else {
      try {
        score = triService.scorePartial(questao.tipo, resposta, gabarito) || 0;
      } catch { score = 0; }
    }

    // ── Calcular XP ────────────────────────────────────────────
    let xp_ganho = Math.round((questao.xp || 100) * score);
    try {
      const anteriores = await respostaRepo.findByAluno(aluno_id);
      const hist = anteriores.slice(0, 50).map(r => {
        const tri = r.tri_snapshot || null;
        return tri ? { tri, score: r.score || 0 } : null;
      }).filter(Boolean);

      const tri = questao.tri || { modelo: '2PL', a: 1, b: 0, c: 0 };
      const theta_antes = triService.estimateTheta(hist) || 0;
      const theta_depois = triService.estimateTheta([...hist, { tri, score }]) || 0;
      xp_ganho = triService.calculateXP(questao.xp || 100, score, theta_antes, tri.b ?? 0) || xp_ganho;

      // Update user theta silently
      try { await dbUpdate('usuarios', aluno_id, {
        theta: theta_depois,
        xp_total: (req.user.xp_total || 0) + xp_ganho
      }); } catch {}
    } catch {}

    // ── Gerar feedback textual ─────────────────────────────────
    if (!feedbackIA) {
      try {
        feedbackIA = await aiService.generateFeedback({
          questao, resposta_aluno: respostaStr, score,
        });
      } catch {
        feedbackIA = score >= 0.8
          ? '✅ Excelente! Continue assim.'
          : '❌ Não foi dessa vez. Revise o conceito e tente novamente!';
      }
    }

    // ── Salvar no banco ────────────────────────────────────────
    const salvo = await respostaRepo.create({
      aluno_id,
      questao_id: Number(questao_id),
      trilha_id:  questao.trilha_id || null,
      resposta:   respostaStr,
      correto:    score >= 0.8 ? 1 : 0,
      score:      score,
      xp_ganho:   xp_ganho,
      tempo_gasto: Math.round((tempo_gasto_ms || 0) / 1000),
      feedback_ia: typeof feedbackIA === 'string' ? feedbackIA : JSON.stringify(feedbackIA),
    });

    // ── Resposta para o frontend ───────────────────────────────
    return res.json({
      resposta:          salvo,
      score,
      is_correct:        score >= 0.8,
      correto:           score >= 0.8 ? 1 : 0,
      score_percentual:  Math.round(score * 100),
      xp_ganho,
      feedback_ia:       feedbackIA,
      gabarito_revelado: gabarito,
      explicacao:        questao.explicacao || null,
    });

  } catch (err) {
    console.error('[RESPOSTA 500]', err.message);
    next(err);
  }
}

// ─── Listar respostas do aluno ────────────────────────────────

async function listByAluno(req, res, next) {
  try {
    const respostas = await respostaRepo.findByAluno(req.user.id);
    const enriched = await Promise.all(respostas.map(async r => {
      try {
        const q = await questaoRepo.findById(r.questao_id);
        return {
          ...r,
          is_correct: r.correto === 1,
          questao_enunciado: q?.enunciado || null,
          questao_tipo:      q?.tipo || null,
          questao_gabarito:  q?.gabarito ?? null,
          questao_explicacao: q?.explicacao || null,
          trilha_id:         q?.trilha_id || null,
        };
      } catch { return { ...r, is_correct: r.correto === 1 }; }
    }));
    res.json({ respostas: enriched, total: enriched.length });
  } catch (err) { next(err); }
}

// ─── Respostas por trilha ─────────────────────────────────────

async function listByTrilha(req, res, next) {
  try {
    const { trilha_id } = req.params;
    const respostas = await respostaRepo.findByAlunoTrilha(req.user.id, trilha_id);
    const questoes  = await questaoRepo.findByTrilha(trilha_id);
    const enriquecidas = respostas.map(r => ({ ...r, is_correct: r.correto === 1 }));
    const progresso = questoes.length > 0
      ? enriquecidas.filter(r => r.is_correct).length / questoes.length : 0;
    res.json({
      respostas: enriquecidas, total: enriquecidas.length,
      progresso: Math.round(progresso * 100), total_questoes: questoes.length,
    });
  } catch (err) { next(err); }
}

// ─── Stats ────────────────────────────────────────────────────

async function getStats(req, res, next) {
  try {
    const aluno_id = req.params.id || req.user.id;
    const respostas = await respostaRepo.findByAluno(aluno_id);
    const total   = respostas.length;
    const corretas = respostas.filter(r => r.correto === 1).length;
    const xp_total = respostas.reduce((a, r) => a + (r.xp_ganho || 0), 0);
    res.json({
      theta: 0, nivel: 'iniciante', total_respostas: total,
      corretas, taxa_acerto: total > 0 ? Math.round(corretas / total * 100) : 0,
      xp_total,
    });
  } catch (err) { next(err); }
}

// ─── Tentativas por trilha ────────────────────────────────────

async function tentativasTrilha(req, res, next) {
  try {
    const { trilha_id } = req.params;
    const respostas = await respostaRepo.findByAlunoTrilha(req.user.id, trilha_id);
    const dias = new Set(respostas.map(r => (r.created_at || '').split('T')[0])).size;
    res.json({ tentativas: dias, total_respostas: respostas.length });
  } catch(err) { next(err); }
}

module.exports = { submitResposta, listByAluno, listByTrilha, getStats, tentativasTrilha };
