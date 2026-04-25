const respostaRepo   = require('../repositories/resposta.repository');
const questaoRepo    = require('../repositories/questao.repository');
const { dbFindWhere, dbUpdate } = require('../database/init');
const triService     = require('../services/tri.service');
const aiService      = require('../services/ai.service');
const calibracaoSvc  = require('../services/calibracao.service');

// ─── Submeter resposta ────────────────────────────────────────

async function submitResposta(req, res, next) {
  try {
    const { questao_id, resposta, tempo_gasto_ms } = req.body;
    const aluno_id = req.user.id;

    if (!questao_id || resposta === undefined) {
      return res.status(400).json({ error: 'questao_id e resposta são obrigatórios.' });
    }

    const questao = await questaoRepo.findById(questao_id);
    if (!questao) return res.status(404).json({ error: 'Questão não encontrada.' });

    // ── Avaliação da resposta ──────────────────────────────────
    let score = 0;
    let avaliacaoIA = null;

    if (questao.tipo === 'dissertativa' || questao.tipo === 'upload_arquivo') {
      // Avaliação por IA (assíncrona)
      try {
        avaliacaoIA = await aiService.evaluateOpenAnswer({
          enunciado: questao.enunciado,
          gabarito_criterios: questao.gabarito,
          resposta_aluno: resposta,
          tipo: questao.tipo,
        });
        score = avaliacaoIA.score;
      } catch {
        score = 0.5; // fallback se IA indisponível
      }
    } else {
      score = triService.scorePartial(questao.tipo, resposta, questao.gabarito);
    }

    // ── Theta atual do aluno ───────────────────────────────────
    const respostasAnteriores = await respostaRepo.findByAluno(aluno_id);
    const historico = respostasAnteriores.map(async r => {
      const q = await questaoRepo.findById(r.questao_id);
      return q ? { tri: q.tri, score: r.score } : null;
    }).filter(Boolean);

    const theta_antes = triService.estimateTheta(historico);

    // ── Salvar resposta ────────────────────────────────────────
    const resposta_salva = await respostaRepo.create({
      aluno_id, questao_id: Number(questao_id),
      trilha_id: questao.trilha_id,
      tipo: questao.tipo, resposta,
      score, is_correct: score >= 0.8,
      tempo_gasto_ms: tempo_gasto_ms || 0,
      theta_momento: theta_antes,
      avaliacao_ia: avaliacaoIA,
    });

    // ── Theta após nova resposta ───────────────────────────────
    const historico_novo = [...historico, { tri: questao.tri, score }];
    const theta_depois = triService.estimateTheta(historico_novo);
    const nivel = triService.thetaToLevel(theta_depois);
    const xp_ganho = triService.calculateXP(questao.xp, score, theta_antes, questao.tri.b);

    // ── Atualizar theta do usuário ─────────────────────────────
    await dbUpdate('usuarios', aluno_id, { theta: theta_depois, xp_total: (req.user.xp_total || 0) + xp_ganho });

    // ── Atualizar contador de respostas da questão ─────────────
    const totalRespostas = await respostaRepo.countByQuestao(questao_id);
    await questaoRepo.updateTRI(questao_id, { ...questao.tri, total_respostas: totalRespostas });

    // ── Calibração assíncrona (não bloqueia resposta) ──────────
    if (totalRespostas >= 30) {
      calibracaoSvc.checkAndCalibrate(questao_id).catch(console.error);
    }

    // ── Feedback IA ────────────────────────────────────────────
    let feedbackIA = null;
    try {
      feedbackIA = await aiService.generateFeedback({
        questao, resposta_aluno: resposta, score,
        theta_antes, theta_depois, xp_ganho,
      });
    } catch {
      feedbackIA = score >= 0.8 ? '✅ Excelente! Continue assim.' : '❌ Não foi dessa vez. Revise o conceito e tente novamente!';
    }

    res.json({
      resposta: resposta_salva,
      score,
      is_correct: score >= 0.8,
      score_percentual: Math.round(score * 100),
      xp_ganho,
      theta: { antes: theta_antes, depois: theta_depois, evolucao: Math.round((theta_depois - theta_antes) * 1000) / 1000 },
      nivel,
      feedback_ia: feedbackIA,
      avaliacao_ia: avaliacaoIA,
      gabarito_revelado: questao.gabarito,
      explicacao: questao.explicacao || null,
    });
  } catch (err) { next(err); }
}

// ─── Listar respostas ─────────────────────────────────────────

async function listByAluno(req, res, next) {
  try {
    const respostas = await respostaRepo.findByAluno(req.user.id);
    // Enriquecer com dados da questão e trilha
    const enriched = respostas.map(async r => {
      const q = await questaoRepo.findById(r.questao_id);
      const trilha = q ? require('../repositories/trilha.repository').findById(q.trilha_id) : null;
      return {
        ...r,
        questao_enunciado: q?.enunciado || null,
        questao_tipo:      q?.tipo || null,
        questao_gabarito:  q?.gabarito ?? null,
        questao_explicacao: q?.explicacao || null,
        trilha_nome:       trilha?.nome || null,
        trilha_id:         q?.trilha_id || null,
      };
    });
    res.json({ respostas: enriched, total: enriched.length });
  } catch (err) { next(err); }
}

async function listByTrilha(req, res, next) {
  try {
    const { trilha_id } = req.params;
    const respostas = await respostaRepo.findByAlunoTrilha(req.user.id, trilha_id);
    const questoes = await questaoRepo.findByTrilha(trilha_id);
    const progresso = questoes.length > 0 ? respostas.filter(r => r.is_correct).length / questoes.length : 0;
    res.json({ respostas, total: respostas.length, progresso: Math.round(progresso * 100), total_questoes: questoes.length });
  } catch (err) { next(err); }
}

async function getStats(req, res, next) {
  try {
    const aluno_id = req.params.id || req.user.id;
    const respostas = await respostaRepo.findByAluno(aluno_id);
    const historico = respostas.map(async r => {
      const q = await questaoRepo.findById(r.questao_id);
      return q ? { tri: q.tri, score: r.score } : null;
    }).filter(Boolean);

    const theta = triService.estimateTheta(historico);
    const nivel = triService.thetaToLevel(theta);
    const total = respostas.length;
    const corretas = respostas.filter(r => r.is_correct).length;
    const xp_total = respostas.reduce((acc, r) => acc + (r.xp_ganho || 0), 0);

    res.json({
      theta, nivel, total_respostas: total,
      corretas, taxa_acerto: total > 0 ? Math.round(corretas / total * 100) : 0,
      xp_total,
    });
  } catch (err) { next(err); }
}

module.exports = { submitResposta, listByAluno, listByTrilha, getStats, tentativasTrilha };

// ── Conta tentativas completas de um aluno numa trilha ────────
async function tentativasTrilha(req, res, next) {
  try {
    const { trilha_id } = req.params;
    const aluno_id = req.user.id;
    // Conta sessões: cada vez que o aluno respondeu todas as questões da trilha = 1 tentativa
    const respostas = (await respostaRepo.findByAluno(aluno_id)).filter(async r => {
      const q = await questaoRepo.findById(r.questao_id);
      return q && String(q.trilha_id) === String(trilha_id);
    });
    // Agrupa por data (sessão = mesmo dia)
    const dias = new Set(respostas.map(r => r.created_at?.split('T')[0])).size;
    res.json({ tentativas: dias, total_respostas: respostas.length });
  } catch(err){ next(err); }
}
