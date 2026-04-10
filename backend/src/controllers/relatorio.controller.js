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

function calcTheta(alunoId) {
  const historico = respostaRepo.findByAluno(alunoId).map(r => {
    const q = questaoRepo.findById(r.questao_id);
    return q ? { tri: q.tri, score: r.score } : null;
  }).filter(Boolean);
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
    const disciplinas = discRepo.findByProfessor(pid);
    const trilhas     = trilhaRepo.findByProfessor(pid);
    const questoes    = questaoRepo.findByProfessor(pid);
    const turmas      = turmaRepo.findByProfessor(pid);

    const alunoIds = new Set();
    for (const t of turmas) turmaRepo.getAlunos(t.id).forEach(a => alunoIds.add(a.aluno_id));

    let totalResp = 0, totalCorretas = 0;
    const porTrilha = trilhas.map(t => {
      const qs = questaoRepo.findByTrilha(t.id);
      let resp = 0, corr = 0;
      for (const q of qs) {
        const rs = respostaRepo.findByQuestao(q.id);
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

    const topAlunos = Array.from(alunoIds).map(aid => {
      const u = userRepo.findById(aid);
      if (!u) return null;
      const rs = respostaRepo.findByAluno(aid);
      const t  = calcTheta(aid);
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
      turmas_prof: turmas.map(t => ({ id: t.id, nome: t.nome, total_alunos: turmaRepo.getAlunos(t.id).length })),
    });
  } catch(e){ next(e); }
}

// ── 2. Relatório por Turma (resumo) ──────────────────────────
async function porTurma(req, res, next) {
  try {
    const { turma_id } = req.params;
    const turma = turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    const alunos = turmaRepo.getAlunos(turma_id).map(mat => {
      const u = userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const rs = respostaRepo.findByAluno(u.id);
      const t  = calcTheta(u.id);
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
    const trilha = trilhaRepo.findById(trilha_id);
    if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });

    const disc = discRepo.findById(trilha.disciplina_id);
    const questoes = questaoRepo.findByTrilha(trilha_id);

    // Para cada questão: todos os alunos que responderam
    const questoesDetalhadas = questoes.map(q => {
      const respostas = respostaRepo.findByQuestao(q.id);
      const alunos_responderam = respostas.map(r => {
        const u = userRepo.findById(r.aluno_id);
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
    const alunosIds = new Set(questoes.flatMap(q => respostaRepo.findByQuestao(q.id).map(r => r.aluno_id)));
    const alunosSummary = Array.from(alunosIds).map(aid => {
      const u = userRepo.findById(aid);
      if (!u) return null;
      const rsAluno = respostaRepo.findByAlunoTrilha(aid, trilha_id);
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

    const aluno = userRepo.findById(targetId);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    const todasRespostas = respostaRepo.findByAluno(targetId);
    const { theta, nivel, emoji } = calcTheta(targetId);

    // Respostas agrupadas por trilha
    const trilhasIds = [...new Set(todasRespostas.map(r => {
      const q = questaoRepo.findById(r.questao_id);
      return q?.trilha_id;
    }).filter(Boolean))];

    const porTrilha = trilhasIds.map(tid => {
      const trilha = trilhaRepo.findById(tid);
      if (!trilha) return null;
      const disc   = discRepo.findById(trilha.disciplina_id);
      const qs     = questaoRepo.findByTrilha(tid);
      const rsAl   = respostaRepo.findByAlunoTrilha(targetId, tid);

      // Evolução temporal (por data)
      const evolucao = rsAl.map(r => {
        const q = questaoRepo.findById(r.questao_id);
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
        const q = questaoRepo.findById(r.questao_id);
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
    const turma = turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    const discIds    = tdRepo.disciplinaIds(turma.id);
    const matriculas = turmaRepo.getAlunos(turma.id);

    // Para cada disciplina, pegar trilhas e análise
    const disciplinasAnalise = discIds.map(discId => {
      const disc   = discRepo.findById(discId);
      if (!disc) return null;
      const trilhas = trilhaRepo.findByDisciplina(discId);

      const trilhasAnalise = trilhas.map(t => {
        const qs = questaoRepo.findByTrilha(t.id);
        const rsTotal = qs.flatMap(q => respostaRepo.findByQuestao(q.id))
          .filter(r => matriculas.some(m => m.aluno_id === r.aluno_id));

        const acertos = rsTotal.filter(r => r.is_correct).length;

        // Questões mais erradas (pontos críticos)
        const questoesCriticas = qs.map(q => {
          const rs = respostaRepo.findByQuestao(q.id).filter(r => matriculas.some(m => m.aluno_id === r.aluno_id));
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
    const ranking = matriculas.map(mat => {
      const u = userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const rs = respostaRepo.findByAluno(u.id);
      const t  = calcTheta(u.id);
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
    const usuarios   = userRepo.findAll();
    const questoes   = questaoRepo.findAll();
    const respostas  = respostaRepo.findAll();
    const disciplinas= discRepo.findAll();
    const turmas     = turmaRepo.findAll();
    const ativos     = usuarios.filter(u => u.status === 'ativo');
    const pendentes  = usuarios.filter(u => u.status === 'pendente');
    const perPerfil  = ativos.reduce((acc,u)=>{ acc[u.perfil]=(acc[u.perfil]||0)+1; return acc; }, {});
    const alunos     = ativos.filter(u => u.perfil === 'aluno');
    let thetaTotal   = 0;
    const alunoStats = alunos.map(u => {
      const rs = respostaRepo.findByAluno(u.id);
      const { theta } = calcTheta(u.id);
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
    const aluno = userRepo.findById(targetId);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    const matriculas = turmaRepo.getTurmasAluno(targetId);
    const turmasData = [];
    for (const mat of matriculas) {
      const turma = turmaRepo.findById(mat.turma_id);
      if (!turma) continue;
      const discIds = tdRepo.disciplinaIds(turma.id);
      const disciplinasData = [];
      for (const discId of discIds) {
        const disc = discRepo.findById(discId);
        if (!disc) continue;
        const avsDisc = avaliacaoRepo.findByTurma(turma.id).filter(av => av.status === 'publicada');
        const avaliacoesAluno = avsDisc.map(av => {
          const tentativas = avaliacaoRepo.findTentativaAlunoAvalia(targetId, av.id)
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
        const trilhasDaDisciplina = trilhaRepo.findByDisciplina(discId);
        const progressoTrilhas = trilhasDaDisciplina.map(t => {
          const rsAl = respostaRepo.findByAlunoTrilha(targetId, t.id);
          const qs = questaoRepo.findByTrilha(t.id);
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
      const { theta, nivel, emoji } = calcTheta(targetId);
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
    const turma = turmaRepo.findById(req.params.turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
    const matriculas = turmaRepo.getAlunos(turma.id);
    const discIds    = tdRepo.disciplinaIds(turma.id);
    const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean);
    const avaliacoesTurma = avaliacaoRepo.findByTurma(turma.id).filter(av => av.status === 'publicada');
    const alunosBoletim = matriculas.map(mat => {
      const aluno = userRepo.findById(mat.aluno_id);
      if (!aluno) return null;
      const disciplinasAluno = disciplinas.map(disc => {
        const avsDisc = avaliacoesTurma.filter(av => !av.disciplina_id || av.disciplina_id===disc.id);
        const notas = avsDisc.map(av => {
          const melhor = avaliacaoRepo.findTentativaAlunoAvalia(aluno.id, av.id)
            .filter(t=>t.status==='concluida').sort((a,b)=>(b.nota||0)-(a.nota||0))[0];
          return melhor ? { av_id:av.id, titulo:av.titulo, nota:melhor.nota, aprovado:melhor.aprovado, peso:av.peso||10 } : null;
        }).filter(Boolean);
        const pt = notas.reduce((s,n)=>s+n.peso,0);
        const media = pt>0 ? round2(notas.reduce((s,n)=>s+n.nota*n.peso,0)/pt) : null;
        return { disc_id:disc.id, disc_nome:disc.nome, media, notas, situacao: media===null?'-':media>=6?'A':'R' };
      });
      const { theta, nivel, emoji } = calcTheta(aluno.id);
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

// ── 9. Exportação Excel ────────────────────────────────────────
async function exportarExcel(req, res, next) {
  try {
    const { tipo, id } = req.params;
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'RSC Academy';
    wb.created = new Date();

    const headerStyle = { font:{bold:true,color:{argb:'FFFFFFFF'},size:11}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF1E3A5F'}}, alignment:{horizontal:'center',vertical:'middle'}, border:{bottom:{style:'thin'}} };
    const subHeaderStyle = { font:{bold:true,size:10}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F0FE'}}, alignment:{horizontal:'center'} };
    const goodStyle  = { font:{color:{argb:'FF166534'}}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFdcfce7'}} };
    const badStyle   = { font:{color:{argb:'FF991B1B'}}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFfee2e2'}} };
    const warnStyle  = { font:{color:{argb:'FF92400E'}}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFfef3c7'}} };

    function applyHeader(row) {
      row.eachCell(c => Object.assign(c, headerStyle));
      row.height = 24;
    }

    if (tipo === 'trilha') {
      const trilha = trilhaRepo.findById(id);
      if (!trilha) return res.status(404).json({ error: 'Trilha não encontrada.' });
      const questoes = questaoRepo.findByTrilha(id);
      const disc = discRepo.findById(trilha.disciplina_id);

      // Aba 1 — Resumo
      const wsRes = wb.addWorksheet('Resumo');
      wsRes.columns = [{width:30},{width:20}];
      applyHeader(wsRes.addRow(['Relatório por Trilha — '+trilha.nome, '']));
      wsRes.mergeCells('A1:B1');
      wsRes.addRow(['Disciplina', disc?.nome||'—']);
      wsRes.addRow(['Total de Questões', questoes.length]);
      const rsAll = questoes.flatMap(q => respostaRepo.findByQuestao(q.id));
      wsRes.addRow(['Total de Respostas', rsAll.length]);
      wsRes.addRow(['Taxa de Acerto', pct(rsAll.filter(r=>r.is_correct).length, rsAll.length)+'%']);
      wsRes.addRow(['Gerado em', new Date().toLocaleString('pt-BR')]);

      // Aba 2 — Questões
      const wsQ = wb.addWorksheet('Questões');
      wsQ.columns = [{header:'#',width:5},{header:'Enunciado',width:50},{header:'Tipo',width:15},{header:'Respostas',width:12},{header:'Acertos',width:10},{header:'Erros',width:10},{header:'Taxa Acerto %',width:14},{header:'Tempo Médio (s)',width:16},{header:'Status TRI',width:14}];
      applyHeader(wsQ.getRow(1));
      questoes.forEach((q,i) => {
        const rs = respostaRepo.findByQuestao(q.id);
        const ac = rs.filter(r=>r.is_correct).length;
        const taxa = pct(ac, rs.length);
        const row = wsQ.addRow([i+1, q.enunciado.slice(0,100), q.tipo, rs.length, ac, rs.length-ac, taxa+'%',
          rs.length>0 ? round2(rs.reduce((s,r)=>s+(r.tempo_gasto_ms||0),0)/rs.length/1000) : '-',
          q.tri?.status||'não calibrado']);
        if (taxa >= 70) row.getCell(7).style = goodStyle;
        else if (taxa < 40) row.getCell(7).style = badStyle;
        else row.getCell(7).style = warnStyle;
      });

      // Aba 3 — Alunos
      const alunosIds = new Set(rsAll.map(r=>r.aluno_id));
      const wsA = wb.addWorksheet('Alunos');
      wsA.columns = [{header:'Nome',width:30},{header:'E-mail',width:30},{header:'Respondidas',width:13},{header:'Acertos',width:10},{header:'Erros',width:10},{header:'Taxa %',width:10},{header:'XP Ganho',width:12},{header:'Última Atividade',width:22}];
      applyHeader(wsA.getRow(1));
      for (const aid of alunosIds) {
        const u = userRepo.findById(aid);
        if (!u) continue;
        const rsAl = respostaRepo.findByAlunoTrilha(aid, id);
        const ac = rsAl.filter(r=>r.is_correct).length;
        const taxa = pct(ac, rsAl.length);
        const row = wsA.addRow([u.nome, u.email, rsAl.length, ac, rsAl.length-ac, taxa+'%',
          rsAl.reduce((s,r)=>s+(r.xp_ganho||0),0),
          rsAl.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]?.created_at?.split('T')[0]||'-']);
        if (taxa >= 70) row.getCell(6).style = goodStyle;
        else if (taxa < 40) row.getCell(6).style = badStyle;
      }

    } else if (tipo === 'aluno') {
      const aluno = userRepo.findById(id);
      if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
      const todasRs = respostaRepo.findByAluno(Number(id));
      const { theta, nivel } = calcTheta(Number(id));

      // Aba 1 — Perfil
      const wsPerfil = wb.addWorksheet('Perfil do Aluno');
      wsPerfil.columns = [{width:30},{width:40}];
      applyHeader(wsPerfil.addRow(['Relatório Individual — '+aluno.nome, '']));
      wsPerfil.mergeCells('A1:B1');
      wsPerfil.addRow(['Nome', aluno.nome]);
      wsPerfil.addRow(['E-mail', aluno.email]);
      wsPerfil.addRow(['Nível TRI (θ)', nivel+' ('+theta+')']);
      wsPerfil.addRow(['Total Respostas', todasRs.length]);
      wsPerfil.addRow(['Taxa de Acerto', pct(todasRs.filter(r=>r.is_correct).length,todasRs.length)+'%']);
      wsPerfil.addRow(['XP Total', todasRs.reduce((s,r)=>s+(r.xp_ganho||0),0)]);
      wsPerfil.addRow(['Gerado em', new Date().toLocaleString('pt-BR')]);

      // Aba 2 — Desempenho por Trilha
      const wsTrilhas = wb.addWorksheet('Por Trilha');
      wsTrilhas.columns = [{header:'Trilha',width:30},{header:'Disciplina',width:25},{header:'Respondidas',width:13},{header:'Total Questões',width:15},{header:'Progresso %',width:13},{header:'Acertos',width:10},{header:'Taxa %',width:10},{header:'XP Ganho',width:12},{header:'Status',width:14}];
      applyHeader(wsTrilhas.getRow(1));
      const trilhasIds = [...new Set(todasRs.map(r=>{ const q=questaoRepo.findById(r.questao_id); return q?.trilha_id; }).filter(Boolean))];
      for (const tid of trilhasIds) {
        const t   = trilhaRepo.findById(tid);
        const disc= discRepo.findById(t?.disciplina_id);
        const qs  = questaoRepo.findByTrilha(tid);
        const rsAl= respostaRepo.findByAlunoTrilha(Number(id), tid);
        const ac  = rsAl.filter(r=>r.is_correct).length;
        const taxa = pct(ac, rsAl.length);
        const row = wsTrilhas.addRow([t?.nome||'-', disc?.nome||'-', rsAl.length, qs.length,
          pct(rsAl.length,qs.length)+'%', ac, taxa+'%',
          rsAl.reduce((s,r)=>s+(r.xp_ganho||0),0),
          rsAl.length>=qs.length?'Concluída':rsAl.length>0?'Em andamento':'Não iniciada']);
        if (taxa>=70) row.getCell(7).style=goodStyle;
        else if (taxa<40) row.getCell(7).style=badStyle;
        else row.getCell(7).style=warnStyle;
      }

      // Aba 3 — Histórico Completo
      const wsHist = wb.addWorksheet('Histórico');
      wsHist.columns = [{header:'Data',width:20},{header:'Questão (resumo)',width:50},{header:'Tipo',width:15},{header:'Trilha',width:25},{header:'Acertou?',width:12},{header:'Score',width:10},{header:'Tempo (s)',width:12},{header:'XP',width:10}];
      applyHeader(wsHist.getRow(1));
      for (const r of todasRs.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))) {
        const q = questaoRepo.findById(r.questao_id);
        const t = q ? trilhaRepo.findById(q.trilha_id) : null;
        const row = wsHist.addRow([
          r.created_at?.split('T')[0]||'-',
          q?.enunciado?.slice(0,80)||'-',
          q?.tipo||'-', t?.nome||'-',
          r.is_correct?'✅ Sim':'❌ Não',
          round2(r.score||0),
          r.tempo_gasto_ms ? Math.round(r.tempo_gasto_ms/1000) : '-',
          r.xp_ganho||0,
        ]);
        if (r.is_correct) row.getCell(5).style=goodStyle;
        else row.getCell(5).style=badStyle;
      }

    } else if (tipo === 'turma') {
      const turma = turmaRepo.findById(id);
      if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
      const matriculas = turmaRepo.getAlunos(turma.id);
      const discIds    = tdRepo.disciplinaIds(turma.id);
      const disciplinas= discIds.map(i=>discRepo.findById(i)).filter(Boolean);

      // Aba 1 — Ranking
      const wsRanking = wb.addWorksheet('Ranking da Turma');
      wsRanking.columns = [{header:'Pos.',width:6},{header:'Nome',width:30},{header:'E-mail',width:30},{header:'Taxa Acerto %',width:15},{header:'Theta TRI',width:12},{header:'Nível',width:15},{header:'Total Respostas',width:16},{header:'XP Total',width:12},{header:'Desempenho',width:14}];
      applyHeader(wsRanking.getRow(1));
      const rankingData = matriculas.map(mat=>{
        const u = userRepo.findById(mat.aluno_id);
        if (!u) return null;
        const rs = respostaRepo.findByAluno(u.id);
        const ac = rs.filter(r=>r.is_correct).length;
        const taxa = pct(ac,rs.length);
        const t = calcTheta(u.id);
        return { nome:u.nome, email:u.email, taxa, ...t, total:rs.length, xp:rs.reduce((s,r)=>s+(r.xp_ganho||0),0) };
      }).filter(Boolean).sort((a,b)=>b.taxa-a.taxa);
      rankingData.forEach((a,i)=>{
        const desemp = desempenhoLabel(a.taxa);
        const row = wsRanking.addRow([i+1, a.nome, a.email, a.taxa+'%', a.theta, a.nivel, a.total, a.xp, desemp.label]);
        if (a.taxa>=70) row.getCell(4).style=goodStyle;
        else if (a.taxa<40) row.getCell(4).style=badStyle;
        else row.getCell(4).style=warnStyle;
      });

      // Aba 2 — Análise por Trilha
      const wsTrilhas = wb.addWorksheet('Análise por Trilha');
      wsTrilhas.columns = [{header:'Disciplina',width:25},{header:'Trilha',width:30},{header:'Questões',width:10},{header:'Participaram',width:14},{header:'Respostas',width:12},{header:'Taxa Média %',width:14},{header:'Desempenho',width:14}];
      applyHeader(wsTrilhas.getRow(1));
      for (const discId of discIds) {
        const disc = discRepo.findById(discId);
        const trilhas = trilhaRepo.findByDisciplina(discId);
        for (const t of trilhas) {
          const qs = questaoRepo.findByTrilha(t.id);
          const rsAll = qs.flatMap(q=>respostaRepo.findByQuestao(q.id)).filter(r=>matriculas.some(m=>m.aluno_id===r.aluno_id));
          const ac  = rsAll.filter(r=>r.is_correct).length;
          const taxa = pct(ac,rsAll.length);
          const row = wsTrilhas.addRow([disc?.nome||'-', t.nome, qs.length,
            new Set(rsAll.map(r=>r.aluno_id)).size, rsAll.length, taxa+'%', desempenhoLabel(taxa).label]);
          if (taxa>=70) row.getCell(6).style=goodStyle;
          else if (taxa<40) row.getCell(6).style=badStyle;
          else row.getCell(6).style=warnStyle;
        }
      }

      // Aba 3 — Questões Críticas
      const wsQC = wb.addWorksheet('Questões Críticas');
      wsQC.columns = [{header:'Questão',width:60},{header:'Tipo',width:15},{header:'Trilha',width:25},{header:'Respostas',width:12},{header:'Taxa Acerto %',width:14}];
      applyHeader(wsQC.getRow(1));
      const todasQs = discIds.flatMap(did=>trilhaRepo.findByDisciplina(did).flatMap(t=>questaoRepo.findByTrilha(t.id)));
      const qsComDados = todasQs.map(q=>{
        const rs = respostaRepo.findByQuestao(q.id).filter(r=>matriculas.some(m=>m.aluno_id===r.aluno_id));
        const ac = rs.filter(r=>r.is_correct).length;
        const taxa = pct(ac,rs.length);
        const t = trilhaRepo.findById(q.trilha_id);
        return { q, rs:rs.length, taxa, trilha:t?.nome||'-' };
      }).filter(q=>q.rs>0).sort((a,b)=>a.taxa-b.taxa).slice(0,20);
      qsComDados.forEach(({q,rs,taxa,trilha})=>{
        const row = wsQC.addRow([q.enunciado.slice(0,100), q.tipo, trilha, rs, taxa+'%']);
        row.getCell(5).style = taxa<40?badStyle:taxa<60?warnStyle:goodStyle;
      });
    }

    // Enviar o arquivo
    const nomeArquivo = `RSCacademy_relatorio_${tipo}_${id}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch(e){ next(e); }
}

module.exports = { profGeral, porTurma, porTrilha, relatorioAluno, turmaCompleto, adminGeral, boletimAluno, boletimTurma, exportarExcel };
