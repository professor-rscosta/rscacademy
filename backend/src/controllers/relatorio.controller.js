/**
 * RSC Academy — Relatórios Completos v2
 * Relatório por Trilha, Individual, por Turma + Exportação Excel
 */
const questaoRepo   = require('../repositories/questao.repository');
const respostaRepo  = require('../repositories/resposta.repository');
const turmaRepo     = require('../repositories/turma.repository');
const userRepo      = require('../repositories/user.repository');
const trilhaRepo    = require('../repositories/trilha.repository');
const discRepo      = require('../repositories/disciplina.repository');
const triService    = require('../services/tri.service');
const avaliacaoRepo = require('../repositories/avaliacao.repository');
const tdRepo        = require('../repositories/turma_disciplina.repository');

// ── Helpers ───────────────────────────────────────────────────
function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0; }
function round2(n)  { return Math.round(n * 100) / 100; }

async function calcTheta(alunoId) {
  const _resps = await respostaRepo.findByAluno(alunoId);
  const _raw = await Promise.all(_resps.map(async r => {
    const q = await questaoRepo.findById(r.questao_id);
    return q ? { tri: q.tri, score: r.score } : null;
  }));
  const historico = _raw.filter(Boolean);
  const theta = triService.estimateTheta(historico);
  const nivel = triService.thetaToLevel(theta);
  return { theta: round2(theta), nivel: nivel.label, emoji: nivel.emoji };
}

function desempenhoLabel(taxa) {
  if (taxa >= 80) return { label: 'Excelente', cor: '#10b981' };
  if (taxa >= 60) return { label: 'Bom',       cor: '#3b82f6' };
  if (taxa >= 40) return { label: 'Regular',   cor: '#f59e0b' };
  return { label: 'Crítico', cor: '#ef4444' };
}

// ── 1. Relatório Geral do Professor ──────────────────────────
async function profGeral(req, res, next) {
  try {
    const pid = req.user.id;
    const disciplinas = await discRepo.findByProfessor(pid);
    const trilhas     = await trilhaRepo.findByProfessor(pid);
    const questoes    = await questaoRepo.findByProfessor(pid);
    const turmas      = await turmaRepo.findByProfessor(pid);

    const alunoIds = new Set();
    for (const t of turmas) (await turmaRepo.getAlunos(t.id)).forEach(a => alunoIds.add(a.aluno_id));

    let totalResp = 0, totalCorretas = 0;
    const porTrilha = trilhas.map(async t => {
      const qs = await questaoRepo.findByTrilha(t.id);
      let resp = 0, corr = 0;
      for (const q of qs) {
        const rs = await respostaRepo.findByQuestao(q.id);
        resp += rs.length; corr += rs.filter(r => r.is_correct).length;
      }
      totalResp += resp; totalCorretas += corr;
      return {
        trilha_id: t.id, nome: t.nome, total_questoes: qs.length,
        total_respostas: resp, corretas: corr,
        taxa_acerto: pct(corr, resp),
        questoes_calibradas: qs.filter(q => q.tri?.status === 'calibrado').length,
      };
    });

    const topAlunos = Array.from(alunoIds).map(async aid => {
      const u = await userRepo.findById(aid);
      if (!u) return null;
      const rs = await respostaRepo.findByAluno(aid);
      const t  = await calcTheta(aid);
      return { id: u.id, nome: u.nome, email: u.email, ...t,
        total_respostas: rs.length, corretas: rs.filter(r => r.is_correct).length,
        taxa_acerto: pct(rs.filter(r => r.is_correct).length, rs.length) };
    }).filter(Boolean).sort((a, b) => b.theta - a.theta);

    res.json({
      resumo: {
        total_disciplinas: disciplinas.length, total_trilhas: trilhas.length,
        total_questoes: questoes.length, total_turmas: turmas.length,
        total_alunos: alunoIds.size, total_respostas: totalResp,
        taxa_acerto_geral: pct(totalCorretas, totalResp),
        questoes_calibradas: questoes.filter(q => q.tri?.status === 'calibrado').length,
      },
      por_trilha: porTrilha,
      top_alunos: topAlunos.slice(0, 10),
      turmas_prof: await Promise.all(turmas.map(async t => ({ id: t.id, nome: t.nome, total_alunos: (await turmaRepo.getAlunos(t.id)).length }))),
    });
  } catch(e){ next(e); }
}

// ── 2. Relatório por Turma (resumo) ──────────────────────────
async function porTurma(req, res, next) {
  try {
    const { turma_id } = req.params;
    const turma = await turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    const alunos = (await turmaRepo.getAlunos(turma_id)).map(async mat => {
      const u = await userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const rs = await respostaRepo.findByAluno(u.id);
      const t  = await calcTheta(u.id);
      return {
        id: u.id, nome: u.nome, email: u.email, ...t,
        total_respostas: rs.length,
        corretas: rs.filter(r => r.is_correct).length,
        taxa_acerto: pct(rs.filter(r => r.is_correct).length, rs.length),
        xp_total: rs.reduce((s, r) => s + (r.xp_ganho||0), 0),
        joined_at: mat.joined_at,
      };
    }).filter(Boolean).sort((a, b) => b.theta - a.theta);

    res.json({ turma, alunos, total: alunos.length });
  } catch(e){ next(e); }
}

// ── 3. Relatório por Trilha (NOVO — completo) ─────────────────
async function porTrilha(req, res, next) {
  try {
    const { trilha_id } = req.params;
    const trilha = await trilhaRepo.findById(trilha_id);
    if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });

    const disc = await discRepo.findById(trilha.disciplina_id);
    const questoes = await questaoRepo.findByTrilha(trilha_id);

    // Para cada questão: todos os alunos que responderam
    const questoesDetalhadas = questoes.map(async q => {
      const respostas = await respostaRepo.findByQuestao(q.id);
      const alunos_responderam = respostas.map(async r => {
        const u = await userRepo.findById(r.aluno_id);
        return u ? {
          aluno_id: u.id, nome: u.nome,
          resposta: r.resposta,
          is_correct: r.is_correct,
          score: round2(r.score || 0),
          tempo_ms: r.tempo_gasto_ms || 0,
          tempo_seg: r.tempo_gasto_ms ? Math.round(r.tempo_gasto_ms / 1000) : null,
          respondida_em: r.created_at,
        } : null;
      }).filter(Boolean);

      const total  = respostas.length;
      const certos = respostas.filter(r => r.is_correct).length;

      return {
        id: q.id,
        enunciado: q.enunciado,
        tipo: q.tipo,
        xp: q.xp,
        tags: q.rag_tags || [],
        tri_parametros: q.tri || {},
        tri_status: q.tri?.status || 'não calibrado',
        total_respostas: total,
        acertos: certos,
        erros: total - certos,
        taxa_acerto: pct(certos, total),
        tempo_medio_seg: respostas.length > 0
          ? round2(respostas.reduce((s, r) => s + (r.tempo_gasto_ms||0), 0) / respostas.length / 1000)
          : null,
        dificuldade: desempenhoLabel(pct(certos, total)),
        alunos: alunos_responderam,
      };
    });

    // Questões críticas (< 40% acerto)
    const questoesCriticas = questoesDetalhadas.filter(q => q.total_respostas > 0 && q.taxa_acerto < 40);
    const questoesFaceis   = questoesDetalhadas.filter(q => q.total_respostas > 0 && q.taxa_acerto >= 80);

    // Alunos participantes
    const _qResps = await Promise.all(questoes.map(q => respostaRepo.findByQuestao(q.id)));
    const alunosIds = new Set(_qResps.flat().map(r => r.aluno_id));
    const alunosSummary = Array.from(alunosIds).map(async aid => {
      const u = await userRepo.findById(aid);
      if (!u) return null;
      const rsAluno = await respostaRepo.findByAlunoTrilha(aid, trilha_id);
      const corretas = rsAluno.filter(r => r.is_correct).length;
      const tempos = rsAluno.filter(r => r.tempo_gasto_ms).map(r => r.tempo_gasto_ms);
      return {
        id: u.id, nome: u.nome,
        questoes_respondidas: rsAluno.length,
        acertos: corretas,
        erros: rsAluno.length - corretas,
        taxa_acerto: pct(corretas, rsAluno.length),
        xp_ganho: rsAluno.reduce((s, r) => s + (r.xp_ganho||0), 0),
        tempo_total_min: tempos.length > 0 ? round2(tempos.reduce((a,b) => a+b, 0) / 60000) : null,
        ultima_atividade: rsAluno.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0]?.created_at || null,
      };
    }).filter(Boolean).sort((a, b) => b.taxa_acerto - a.taxa_acerto);

    const totalResps  = questoesDetalhadas.reduce((s, q) => s + q.total_respostas, 0);
    const totalAcertos= questoesDetalhadas.reduce((s, q) => s + q.acertos, 0);

    res.json({
      trilha: { ...trilha, disciplina: disc?.nome },
      estatisticas: {
        total_questoes: questoes.length,
        total_alunos_participaram: alunosIds.size,
        total_respostas: totalResps,
        taxa_acerto_geral: pct(totalAcertos, totalResps),
        questoes_criticas: questoesCriticas.length,
        questoes_faceis: questoesFaceis.length,
        questoes_calibradas: questoes.filter(q => q.tri?.status === 'calibrado').length,
      },
      questoes: questoesDetalhadas,
      alunos: alunosSummary,
      questoes_criticas: questoesCriticas.slice(0, 5),
      gerado_em: new Date().toISOString(),
    });
  } catch(e){ next(e); }
}

// ── 4. Relatório Individual do Aluno (NOVO — completo) ────────
async function relatorioAluno(req, res, next) {
  try {
    const targetId = req.params.aluno_id ? Number(req.params.aluno_id) : req.user.id;
    if (req.user.perfil === 'aluno' && targetId !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    const aluno = await userRepo.findById(targetId);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    const todasRespostas = await respostaRepo.findByAluno(targetId);
    const { theta, nivel, emoji } = await calcTheta(targetId);

    // Respostas agrupadas por trilha
    const trilhasIds = [...new Set(todasRespostas.map(async r => {
      const q = await questaoRepo.findById(r.questao_id);
      return q?.trilha_id;
    }).filter(Boolean))];

    const porTrilha = trilhasIds.map(async tid => {
      const trilha = await trilhaRepo.findById(tid);
      if (!trilha) return null;
      const disc   = await discRepo.findById(trilha.disciplina_id);
      const qs     = await questaoRepo.findByTrilha(tid);
      const rsAl   = await respostaRepo.findByAlunoTrilha(targetId, tid);

      // Evolução temporal (por data)
      const evolucao = rsAl.map(async r => {
        const q = await questaoRepo.findById(r.questao_id);
        return {
          data: r.created_at,
          is_correct: r.is_correct,
          score: round2(r.score||0),
          tipo: q?.tipo,
          tempo_seg: r.tempo_gasto_ms ? Math.round(r.tempo_gasto_ms/1000) : null,
        };
      }).sort((a,b) => new Date(a.data) - new Date(b.data));

      const acertos = rsAl.filter(r => r.is_correct).length;
      const taxa    = pct(acertos, rsAl.length);
      const xp      = rsAl.reduce((s, r) => s + (r.xp_ganho||0), 0);

      // Pontos fortes e fracos por tipo de questão
      const porTipo = {};
      for (const r of rsAl) {
        const q = await questaoRepo.findById(r.questao_id);
        if (!q) continue;
        if (!porTipo[q.tipo]) porTipo[q.tipo] = { total: 0, acertos: 0 };
        porTipo[q.tipo].total++;
        if (r.is_correct) porTipo[q.tipo].acertos++;
      }
      const analise_por_tipo = Object.entries(porTipo).map(([tipo, d]) => ({
        tipo, total: d.total, acertos: d.acertos,
        taxa: pct(d.acertos, d.total),
        classificacao: desempenhoLabel(pct(d.acertos, d.total)),
      }));

      // Detalhamento por questão
      const questoes_detalhes = qs.map((q, qi) => {
        // Pegar a resposta mais recente do aluno para esta questão
        const respostasQ = rsAl.filter(r => r.questao_id === q.id)
          .sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
        const resp = respostasQ[0];
        return {
          numero: qi + 1,
          enunciado: q.enunciado,
          tipo: q.tipo,
          alternativas: q.alternativas || null,
          gabarito: q.gabarito ?? null,
          explicacao: q.explicacao || null,
          resposta_aluno: resp?.resposta ?? null,
          is_correct: resp?.is_correct ?? null,
          score: resp ? round2(resp.score||0) : null,
          feedback_ia: resp?.feedback_ia || null,
          data: resp?.created_at?.split('T')[0] || null,
          hora: resp?.created_at ? new Date(resp.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : null,
          tentativas: respostasQ.length,
          xp_ganho: resp?.xp_ganho || 0,
        };
      });

      // Sessões/tentativas do aluno nesta trilha (agrupadas por dia)
      const diasMap = {};
      rsAl.forEach((r) => {

        const dia = r.created_at?.split('T')[0] || 'desconhecido';
        if (!diasMap[dia]) diasMap[dia] = { data: dia, respostas: 0, acertos: 0 };
        diasMap[dia].respostas++;
        if (r.is_correct) diasMap[dia].acertos++;
      
    })
      const tentativas = Object.values(diasMap).sort((a,b) => a.data.localeCompare(b.data))
        .map((d, i) => ({ numero: i+1, ...d, taxa: pct(d.acertos, d.respostas) }));

      return {
        trilha_id: tid, nome: trilha.nome, disciplina: disc?.nome,
        total_questoes: qs.length,
        respondidas: rsAl.length,
        progresso: pct(rsAl.length, qs.length),
        acertos, erros: rsAl.length - acertos, taxa_acerto: taxa,
        xp_ganho: xp,
        desempenho: desempenhoLabel(taxa),
        tempo_total_min: round2(rsAl.reduce((s,r)=>s+(r.tempo_gasto_ms||0),0)/60000),
        evolucao,
        analise_por_tipo,
        questoes_detalhes,
        tentativas,
        ultima_atividade: rsAl.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]?.created_at || null,
        status: rsAl.length >= qs.length ? 'concluída' : rsAl.length > 0 ? 'em andamento' : 'não iniciada',
      };
    }).filter(Boolean);

    // Pontos fortes e dificuldades globais
    const pontosFortes    = porTrilha.filter(t => t.taxa_acerto >= 70).map(t => t.nome);
    const dificuldades    = porTrilha.filter(t => t.taxa_acerto < 50 && t.respondidas > 0).map(t => t.nome);
    const trilhasCompletas= porTrilha.filter(t => t.status === 'concluída').length;

    // Histórico de XP ao longo do tempo
    const historicoXP = todasRespostas
      .sort((a,b) => new Date(a.created_at)-new Date(b.created_at))
      .reduce((acc, r) => {
        const xpAcum = (acc[acc.length-1]?.xp_acumulado || 0) + (r.xp_ganho||0);
        acc.push({ data: r.created_at.split('T')[0], xp_acumulado: xpAcum });
        return acc;
      }, []);

    const { senha_hash, ...alunoSafe } = aluno;
    res.json({
      aluno: { ...alunoSafe, theta, nivel, nivel_emoji: emoji },
      resumo: {
        total_respostas: todasRespostas.length,
        acertos: todasRespostas.filter(r => r.is_correct).length,
        taxa_acerto_geral: pct(todasRespostas.filter(r=>r.is_correct).length, todasRespostas.length),
        trilhas_iniciadas: porTrilha.filter(t => t.respondidas > 0).length,
        trilhas_completas: trilhasCompletas,
        xp_total: todasRespostas.reduce((s,r)=>s+(r.xp_ganho||0),0),
        tempo_total_min: round2(todasRespostas.reduce((s,r)=>s+(r.tempo_gasto_ms||0),0)/60000),
      },
      pontos_fortes: pontosFortes,
      dificuldades,
      por_trilha: porTrilha,
      historico_xp: historicoXP,
      gerado_em: new Date().toISOString(),
    });
  } catch(e){ next(e); }
}

// ── 5. Relatório Completo da Turma (NOVO) ─────────────────────
async function turmaCompleto(req, res, next) {
  try {
    const { turma_id } = req.params;
    const turma = await turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    const discIds    = await tdRepo.disciplinaIds(turma.id);
    const matriculas = await turmaRepo.getAlunos(turma.id);

    // Para cada disciplina, pegar trilhas e análise
    const disciplinasAnalise = discIds.map(async discId => {
      const disc   = await discRepo.findById(discId);
      if (!disc) return null;
      const trilhas = await trilhaRepo.findByDisciplina(discId);

      const trilhasAnalise = trilhas.map(async t => {
        const qs = await questaoRepo.findByTrilha(t.id);
        const rsTotal = (await Promise.all((qs).map(async q => respostaRepo.findByQuestao(q.id)))).flat()
          .filter(r => matriculas.some(m => m.aluno_id === r.aluno_id));

        const acertos = rsTotal.filter(r => r.is_correct).length;

        // Questões mais erradas (pontos críticos)
        const questoesCriticas = qs.map(async q => {
          const rs = (await respostaRepo.findByQuestao(q.id)).filter(r => matriculas.some(m => m.aluno_id === r.aluno_id));
          const ac = rs.filter(r => r.is_correct).length;
          return { id: q.id, enunciado: q.enunciado.slice(0, 80), tipo: q.tipo,
            total: rs.length, acertos: ac, taxa: pct(ac, rs.length) };
        }).filter(q => q.total > 0).sort((a,b) => a.taxa - b.taxa);

        return {
          id: t.id, nome: t.nome,
          total_questoes: qs.length,
          total_respostas_turma: rsTotal.length,
          taxa_acerto_media: pct(acertos, rsTotal.length),
          alunos_participaram: new Set(rsTotal.map(r=>r.aluno_id)).size,
          questoes_criticas: questoesCriticas.slice(0, 3),
          desempenho: desempenhoLabel(pct(acertos, rsTotal.length)),
        };
      });

      return { id: discId, nome: disc.nome, trilhas: trilhasAnalise };
    }).filter(Boolean);

    // Ranking dos alunos
    const ranking = matriculas.map(async mat => {
      const u = await userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const rs = await respostaRepo.findByAluno(u.id);
      const t  = await calcTheta(u.id);
      const ac = rs.filter(r => r.is_correct).length;
      return {
        id: u.id, nome: u.nome, ...t,
        total_respostas: rs.length, acertos: ac,
        taxa_acerto: pct(ac, rs.length),
        xp_total: rs.reduce((s,r)=>s+(r.xp_ganho||0),0),
        desempenho: desempenhoLabel(pct(ac, rs.length)),
      };
    }).filter(Boolean).sort((a,b) => b.taxa_acerto - a.taxa_acerto);

    // Estatísticas globais da turma
    const totalResps  = ranking.reduce((s,a)=>s+a.total_respostas,0);
    const totalAcerts = ranking.reduce((s,a)=>s+a.acertos,0);
    const mediaTheta  = ranking.length > 0
      ? round2(ranking.reduce((s,a)=>s+a.theta,0)/ranking.length) : 0;

    // Distribuição de desempenho
    const distribuicao = {
      excelente: ranking.filter(a => a.taxa_acerto >= 80).length,
      bom:       ranking.filter(a => a.taxa_acerto >= 60 && a.taxa_acerto < 80).length,
      regular:   ranking.filter(a => a.taxa_acerto >= 40 && a.taxa_acerto < 60).length,
      critico:   ranking.filter(a => a.taxa_acerto < 40).length,
    };

    res.json({
      turma,
      estatisticas: {
        total_alunos: ranking.length,
        total_respostas: totalResps,
        taxa_acerto_media: pct(totalAcerts, totalResps),
        theta_medio: mediaTheta,
        distribuicao,
      },
      disciplinas: disciplinasAnalise,
      ranking,
      gerado_em: new Date().toISOString(),
    });
  } catch(e){ next(e); }
}

// ── 6. Admin Geral ─────────────────────────────────────────────
async function adminGeral(req, res, next) {
  try {
    const usuarios   = await userRepo.findAll();
    const questoes   = await questaoRepo.findAll();
    const respostas  = await respostaRepo.findAll();
    const disciplinas= await discRepo.findAll();
    const turmas     = await turmaRepo.findAll();
    const ativos     = usuarios.filter(u => u.status === 'ativo');
    const pendentes  = usuarios.filter(u => u.status === 'pendente');
    const perPerfil  = ativos.reduce((acc,u)=>{ acc[u.perfil]=(acc[u.perfil]||0)+1; return acc; }, {});
    const alunos     = ativos.filter(u => u.perfil === 'aluno');
    let thetaTotal   = 0;
    const alunoStats = alunos.map(async u => {
      const rs = await respostaRepo.findByAluno(u.id);
      const { theta } = await calcTheta(u.id);
      thetaTotal += theta;
      return { id: u.id, nome: u.nome, theta, total_respostas: rs.length };
    });
    res.json({
      usuarios: { total: usuarios.length, ativos: ativos.length, pendentes: pendentes.length, por_perfil: perPerfil },
      conteudo: { disciplinas: disciplinas.length, turmas: turmas.length, questoes: questoes.length,
        questoes_calibradas: questoes.filter(q => q.tri?.status === 'calibrado').length },
      atividade: { total_respostas: respostas.length,
        taxa_acerto: pct(respostas.filter(r=>r.is_correct).length, respostas.length),
        theta_medio_alunos: alunos.length > 0 ? round2(thetaTotal/alunos.length) : 0 },
      top_alunos: alunoStats.sort((a,b)=>b.theta-a.theta).slice(0,5),
    });
  } catch(e){ next(e); }
}

// ── 7. Boletim do Aluno ────────────────────────────────────────
async function boletimAluno(req, res, next) {
  try {
    const targetId = req.params.aluno_id ? Number(req.params.aluno_id) : req.user.id;
    if (req.user.perfil === 'aluno' && targetId !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });
    const aluno = await userRepo.findById(targetId);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    const matriculas = await turmaRepo.getTurmasAluno(targetId);
    const turmasData = [];
    for (const mat of matriculas) {
      const turma = await turmaRepo.findById(mat.turma_id);
      if (!turma) continue;
      const discIds = await tdRepo.disciplinaIds(turma.id);
      const disciplinasData = [];
      for (const discId of discIds) {
        const disc = await discRepo.findById(discId);
        if (!disc) continue;
        const avsDisc = (await avaliacaoRepo.findByTurma(turma.id)).filter(av => av.status === 'publicada');
        const avaliacoesAluno = avsDisc.map(async av => {
          const tentativas = await avaliacaoRepo.findTentativaAlunoAvalia(targetId, av.id)
            .filter(t => t.status === 'concluida').sort((a,b)=>(b.nota||0)-(a.nota||0));
          const melhor = tentativas[0] || null;
          const nota   = melhor?.nota ?? null;
          return {
            id: av.id, titulo: av.titulo, tipo: av.tipo,
            nota_minima: av.nota_minima || 6, peso: av.peso || 10,
            total_tentativas: tentativas.length,
            melhor_nota: nota,
            aprovado: nota !== null ? nota >= (av.nota_minima||6) : null,
            status_aluno: tentativas.length===0 ? 'nao_realizada' : nota>=(av.nota_minima||6) ? 'aprovado' : 'reprovado',
            realizada_em: melhor?.concluida_em || null,
          };
        });
        const realizadas = avaliacoesAluno.filter(a => a.melhor_nota !== null);
        let media = null;
        if (realizadas.length > 0) {
          const sp = realizadas.reduce((s,a)=>s+(a.melhor_nota||0)*(a.peso||10),0);
          const pt = realizadas.reduce((s,a)=>s+(a.peso||10),0);
          media = round2(sp/pt);
        }
        const trilhasDaDisciplina = await trilhaRepo.findByDisciplina(discId);
        const progressoTrilhas = trilhasDaDisciplina.map(async t => {
          const rsAl = await respostaRepo.findByAlunoTrilha(targetId, t.id);
          const qs = await questaoRepo.findByTrilha(t.id);
          return { id:t.id, nome:t.nome,
            progresso: Math.min(100, pct(rsAl.length, qs.length)),
            total_questoes: qs.length, respondidas: rsAl.length };
        });
        disciplinasData.push({
          id: disc.id, nome: disc.nome, codigo: disc.codigo, carga_horaria: disc.carga_horaria,
          avaliacoes: avaliacoesAluno, media_disciplina: media,
          situacao: media===null ? 'em_andamento' : media>=6 ? 'aprovado' : 'reprovado',
          trilhas: progressoTrilhas,
          total_avaliacoes: avaliacoesAluno.length, avaliacoes_realizadas: realizadas.length,
        });
      }
      const discComMedia = disciplinasData.filter(d => d.media_disciplina !== null);
      const mediaGeral = discComMedia.length>0
        ? round2(discComMedia.reduce((s,d)=>s+d.media_disciplina,0)/discComMedia.length) : null;
      const { theta, nivel, emoji } = await calcTheta(targetId);
      turmasData.push({
        id: turma.id, nome: turma.nome, descricao: turma.descricao, joined_at: mat.joined_at,
        disciplinas: disciplinasData, media_geral: mediaGeral,
        situacao_geral: mediaGeral===null ? 'em_andamento' : mediaGeral>=6 ? 'aprovado' : 'reprovado',
        theta, nivel, nivel_emoji: emoji,
      });
    }
    const { senha_hash, ...alunoSafe } = aluno;
    res.json({ aluno: alunoSafe, turmas: turmasData, gerado_em: new Date().toISOString() });
  } catch(e){ next(e); }
}

// ── 8. Boletim da Turma ────────────────────────────────────────
async function boletimTurma(req, res, next) {
  try {
    const turma = await turmaRepo.findById(req.params.turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
    const matriculas = await turmaRepo.getAlunos(turma.id);
    const discIds    = await tdRepo.disciplinaIds(turma.id);
    const disciplinas = discIds.map(async id => await discRepo.findById(id)).filter(Boolean);
    const avaliacoesTurma = (await avaliacaoRepo.findByTurma(turma.id)).filter(av => av.status === 'publicada');
    const alunosBoletim = matriculas.map(async mat => {
      const aluno = await userRepo.findById(mat.aluno_id);
      if (!aluno) return null;
      const disciplinasAluno = disciplinas.map(async disc => {
        const avsDisc = avaliacoesTurma.filter(av => !av.disciplina_id || av.disciplina_id===disc.id);
        const notas = avsDisc.map(async av => {
          const melhor = await avaliacaoRepo.findTentativaAlunoAvalia(aluno.id, av.id)
            .filter(t=>t.status==='concluida').sort((a,b)=>(b.nota||0)-(a.nota||0))[0];
          return melhor ? { av_id:av.id, titulo:av.titulo, nota:melhor.nota, aprovado:melhor.aprovado, peso:av.peso||10 } : null;
        }).filter(Boolean);
        const pt = notas.reduce((s,n)=>s+n.peso,0);
        const media = pt>0 ? round2(notas.reduce((s,n)=>s+n.nota*n.peso,0)/pt) : null;
        return { disc_id:disc.id, disc_nome:disc.nome, media, notas, situacao: media===null?'-':media>=6?'A':'R' };
      });
      const { theta, nivel, emoji } = await calcTheta(aluno.id);
      const discComMedia = disciplinasAluno.filter(d=>d.media!==null);
      const mediaGeral = discComMedia.length>0
        ? round2(discComMedia.reduce((s,d)=>s+d.media,0)/discComMedia.length) : null;
      const { senha_hash, ...safe } = aluno;
      return { ...safe, disciplinas: disciplinasAluno, media_geral: mediaGeral,
        theta, nivel, nivel_emoji: emoji,
        rendimento: mediaGeral===null ? 'sem dados' : mediaGeral>=8 ? 'alto' : mediaGeral>=6 ? 'médio' : 'baixo' };
    }).filter(Boolean).sort((a,b)=>(b.media_geral||0)-(a.media_geral||0));

    const comMedia = alunosBoletim.filter(a=>a.media_geral!==null);
    const mediaGeral = comMedia.length>0 ? round2(comMedia.reduce((s,a)=>s+a.media_geral,0)/comMedia.length) : null;
    res.json({
      turma: { ...turma, disciplinas: disciplinas.map(d=>({id:d.id,nome:d.nome})), avaliacoes: avaliacoesTurma.map(a=>({id:a.id,titulo:a.titulo,tipo:a.tipo})) },
      alunos: alunosBoletim,
      estatisticas: { total_alunos: alunosBoletim.length, media_geral: mediaGeral,
        aprovados: comMedia.filter(a=>a.media_geral>=6).length,
        reprovados: comMedia.length-comMedia.filter(a=>a.media_geral>=6).length,
        taxa_aprovacao: comMedia.length>0?pct(comMedia.filter(a=>a.media_geral>=6).length,comMedia.length):0 },
      gerado_em: new Date().toISOString(),
    });
  } catch(e){ next(e); }
}

// ── 9. Exportação Excel (xlsx — puro JS, sem deps nativas) ──────
async function exportarExcel(req, res, next) {
  try {
    const { tipo, id } = req.params;
    const XLSX = require('xlsx');

    const wb = XLSX.utils.book_new();

    // Helpers
    function addSheet(name, rows) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Auto column width
      const cols = rows[0] ? rows[0].map((_, i) => ({
        wch: Math.max(...rows.map(r => String(r[i]||'').length).filter(n=>n<80), 10)
      })) : [];
      ws['!cols'] = cols;
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0,31));
    }

    if (tipo === 'trilha') {
      const trilha  = await trilhaRepo.findById(id);
      if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });
      const disc    = await discRepo.findById(trilha.disciplina_id);
      const questoes = await questaoRepo.findByTrilha(id);
      const rsAll   = (await Promise.all((questoes).map(async q => respostaRepo.findByQuestao(q.id)))).flat();
      const alunosIds = [...new Set(rsAll.map(r => r.aluno_id))];

      // Aba Resumo
      addSheet('Resumo', [
        ['Relatório por Trilha', trilha.nome],
        ['Disciplina', disc?.nome||'—'],
        ['Total Questões', questoes.length],
        ['Total Respostas', rsAll.length],
        ['Taxa de Acerto', pct(rsAll.filter(r=>r.is_correct).length, rsAll.length)+'%'],
        ['Gerado em', new Date().toLocaleString('pt-BR')],
      ]);

      // Aba Questões
      const qRows = [['#','Enunciado','Tipo','Respostas','Acertos','Erros','Taxa %','Tempo Médio (s)','TRI']];
      let _qi = 0;
      for (const q of questoes) { const i = _qi++;
        const rs = await respostaRepo.findByQuestao(q.id);
        const ac = rs.filter(r=>r.is_correct).length;
        qRows.push([i+1, q.enunciado.slice(0,100), q.tipo, rs.length, ac, rs.length-ac,
          pct(ac,rs.length)+'%',
          rs.length>0 ? round2(rs.reduce((s,r)=>s+(r.tempo_gasto_ms||0),0)/rs.length/1000) : '-',
          q.tri?.status||'não calibrado']);
      }
      addSheet('Questões', qRows);

      // Aba Alunos
      const aRows = [['Nome','E-mail','Respondidas','Acertos','Taxa %','XP','Última Atividade']];
      for (const aid of alunosIds) {
        const u = await userRepo.findById(aid);
        if (!u) continue;
        const rsAl = await respostaRepo.findByAlunoTrilha(aid, id);
        const ac = rsAl.filter(r=>r.is_correct).length;
        aRows.push([u.nome, u.email, rsAl.length, ac, pct(ac,rsAl.length)+'%',
          rsAl.reduce((s,r)=>s+(r.xp_ganho||0),0),
          rsAl.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]?.created_at?.split('T')[0]||'-']);
      }
      addSheet('Alunos', aRows);

    } else if (tipo === 'aluno') {
      const aluno = await userRepo.findById(id);
      if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
      const todasRs = await respostaRepo.findByAluno(Number(id));
      const { theta, nivel } = await calcTheta(Number(id));

      // Aba Perfil
      addSheet('Perfil do Aluno', [
        ['Relatório Individual', aluno.nome],
        ['E-mail', aluno.email],
        ['Nível TRI', nivel+' ('+theta+')'],
        ['Total Respostas', todasRs.length],
        ['Taxa de Acerto', pct(todasRs.filter(r=>r.is_correct).length,todasRs.length)+'%'],
        ['XP Total', todasRs.reduce((s,r)=>s+(r.xp_ganho||0),0)],
        ['Gerado em', new Date().toLocaleString('pt-BR')],
      ]);

      // Aba Por Trilha
      const tRows = [['Trilha','Disciplina','Respondidas','Total','Progresso %','Acertos','Taxa %','XP','Status']];
      const _tqList = await Promise.all(todasRs.map(r => questaoRepo.findById(r.questao_id)));
      const trilhasIds = [...new Set(_tqList.map(q => q?.trilha_id).filter(Boolean))];
      for (const tid of trilhasIds) {
        const t = await trilhaRepo.findById(tid);
        const disc = await discRepo.findById(t?.disciplina_id);
        const qs = await questaoRepo.findByTrilha(tid);
        const rsAl = await respostaRepo.findByAlunoTrilha(Number(id), tid);
        const ac = rsAl.filter(r=>r.is_correct).length;
        tRows.push([t?.nome||'-', disc?.nome||'-', rsAl.length, qs.length,
          pct(rsAl.length,qs.length)+'%', ac, pct(ac,rsAl.length)+'%',
          rsAl.reduce((s,r)=>s+(r.xp_ganho||0),0),
          rsAl.length>=qs.length?'Concluída':rsAl.length>0?'Em andamento':'Não iniciada']);
      }
      addSheet('Por Trilha', tRows);

      // Aba Histórico
      const hRows = [['Data','Questão','Tipo','Trilha','Acertou?','Score','Tempo (s)','XP']];
      for (const r of todasRs.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))) {
        const q = await questaoRepo.findById(r.questao_id);
        const t = q ? await trilhaRepo.findById(q.trilha_id) : null;
        hRows.push([r.created_at?.split('T')[0]||'-', q?.enunciado?.slice(0,80)||'-',
          q?.tipo||'-', t?.nome||'-', r.is_correct?'Sim':'Não',
          round2(r.score||0), r.tempo_gasto_ms?Math.round(r.tempo_gasto_ms/1000):'-', r.xp_ganho||0]);
      }
      addSheet('Histórico', hRows);

    } else if (tipo === 'turma') {
      const turma = await turmaRepo.findById(id);
      if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
      const matriculas = await turmaRepo.getAlunos(turma.id);
      const discIds = await tdRepo.disciplinaIds(turma.id);

      // Aba Ranking
      const rRows = [['Pos.','Nome','E-mail','Taxa %','Theta TRI','Nível','Respostas','XP']];
      const rankingData = matriculas.map(async mat => {
        const u = await userRepo.findById(mat.aluno_id);
        if (!u) return null;
        const rs = await respostaRepo.findByAluno(u.id);
        const ac = rs.filter(r=>r.is_correct).length;
        const t = await calcTheta(u.id);
        return { nome:u.nome, email:u.email, taxa:pct(ac,rs.length), ...t, total:rs.length, xp:rs.reduce((s,r)=>s+(r.xp_ganho||0),0) };
      }).filter(Boolean).sort((a,b)=>b.taxa-a.taxa);
      rankingData.forEach((a,i) => rRows.push([i+1,a.nome,a.email,a.taxa+'%',a.theta,a.nivel,a.total,a.xp]));
      addSheet('Ranking da Turma', rRows);

      // Aba Trilhas
      const trRows = [['Disciplina','Trilha','Questões','Participaram','Respostas','Taxa %']];
      for (const discId of discIds) {
        const disc = await discRepo.findById(discId);
        const trilhas = await trilhaRepo.findByDisciplina(discId);
        for (const t of trilhas) {
          const qs = await questaoRepo.findByTrilha(t.id);
          const rsAll = (await Promise.all(qs.map(q => respostaRepo.findByQuestao(q.id)))).flat().filter(r=>matriculas.some(m=>m.aluno_id===r.aluno_id));
          const ac = rsAll.filter(r=>r.is_correct).length;
          trRows.push([disc?.nome||'-', t.nome, qs.length, new Set(rsAll.map(r=>r.aluno_id)).size, rsAll.length, pct(ac,rsAll.length)+'%']);
        }
      }
      addSheet('Por Trilha', trRows);

      // Aba Questões Críticas
      const qcRows = [['Questão','Tipo','Trilha','Respostas','Taxa %']];
      const _trilhasPerDisc = await Promise.all(discIds.map(did => trilhaRepo.findByDisciplina(did)));
      const _allTrilhas = _trilhasPerDisc.flat();
      const _qsPerTrilha = await Promise.all(_allTrilhas.map(t => questaoRepo.findByTrilha(t.id)));
      const todasQs = _qsPerTrilha.flat();
      const _qcData = [];
      for (const q of todasQs) {
        const _rsQ = await respostaRepo.findByQuestao(q.id);
        const rs = _rsQ.filter(r=>matriculas.some(m=>m.aluno_id===r.aluno_id));
        const ac = rs.filter(r=>r.is_correct).length;
        const t = await trilhaRepo.findById(q.trilha_id);
        _qcData.push({ q, rs:rs.length, taxa:pct(ac,rs.length), trilha:t?.nome||'-' });
      }
      _qcData.filter(q=>q.rs>0).sort((a,b)=>a.taxa-b.taxa).slice(0,20)
        .forEach(({q,rs,taxa,trilha}) => qcRows.push([q.enunciado.slice(0,100), q.tipo, trilha, rs, taxa+'%']));
      addSheet('Questões Críticas', qcRows);
    }

    // Enviar arquivo
    const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
    const nome = 'RSCacademy_'+tipo+'_'+id+'_'+Date.now()+'.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="'+nome+'"');
    res.send(buf);
  } catch(e){ next(e); }
}


module.exports = { profGeral, porTurma, porTrilha, relatorioAluno, turmaCompleto, adminGeral, boletimAluno, boletimTurma, exportarExcel };
