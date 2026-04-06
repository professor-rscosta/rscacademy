const questaoRepo   = require('../repositories/questao.repository');
const respostaRepo  = require('../repositories/resposta.repository');
const turmaRepo     = require('../repositories/turma.repository');
const userRepo      = require('../repositories/user.repository');
const trilhaRepo    = require('../repositories/trilha.repository');
const discRepo      = require('../repositories/disciplina.repository');
const triService    = require('../services/tri.service');
const avaliacaoRepo = require('../repositories/avaliacao.repository');
const tdRepo        = require('../repositories/turma_disciplina.repository');

// ── Relatório do Professor ────────────────────────────────────
async function profGeral(req, res, next) {
  try {
    const pid = req.user.id;
    const disciplinas = discRepo.findByProfessor(pid);
    const trilhas     = trilhaRepo.findByProfessor(pid);
    const questoes    = questaoRepo.findByProfessor(pid);
    const turmas      = turmaRepo.findByProfessor(pid);

    // Total de alunos únicos
    const alunoIds = new Set();
    for (const t of turmas) turmaRepo.getAlunos(t.id).forEach(a => alunoIds.add(a.aluno_id));

    // Respostas de todas as questões do professor
    let totalResp = 0, totalCorretas = 0;
    const porTrilha = trilhas.map(t => {
      const qs = questaoRepo.findByTrilha(t.id);
      let resp = 0, corr = 0;
      for (const q of qs) {
        const rs = respostaRepo.findByQuestao(q.id);
        resp += rs.length;
        corr += rs.filter(r => r.is_correct).length;
      }
      totalResp += resp; totalCorretas += corr;
      return {
        trilha_id: t.id, nome: t.nome, total_questoes: qs.length,
        total_respostas: resp, corretas: corr,
        taxa_acerto: resp > 0 ? Math.round(corr / resp * 100) : 0,
        questoes_calibradas: qs.filter(q => q.tri?.status === 'calibrado').length,
      };
    });

    // Top alunos (por XP)
    const topAlunos = Array.from(alunoIds).map(aid => {
      const u = userRepo.findById(aid);
      if (!u) return null;
      const rs = respostaRepo.findByAluno(aid);
      const historico = rs.map(r => { const q = questaoRepo.findById(r.questao_id); return q ? { tri:q.tri, score:r.score } : null; }).filter(Boolean);
      const theta = triService.estimateTheta(historico);
      const nivel = triService.thetaToLevel(theta);
      return { id: u.id, nome: u.nome, email: u.email, theta, nivel: nivel.label, emoji: nivel.emoji, total_respostas: rs.length, corretas: rs.filter(r => r.is_correct).length };
    }).filter(Boolean).sort((a, b) => b.theta - a.theta);

    res.json({
      resumo: {
        total_disciplinas: disciplinas.length,
        total_trilhas:     trilhas.length,
        total_questoes:    questoes.length,
        total_turmas:      turmas.length,
        total_alunos:      alunoIds.size,
        total_respostas:   totalResp,
        taxa_acerto_geral: totalResp > 0 ? Math.round(totalCorretas / totalResp * 100) : 0,
        questoes_calibradas: questoes.filter(q => q.tri?.status === 'calibrado').length,
      },
      por_trilha: porTrilha,
      top_alunos: topAlunos.slice(0, 10),
      turmas_prof: turmas.map(t => ({ id:t.id, nome:t.nome, total_alunos: turmaRepo.getAlunos(t.id).length })),
    });
  } catch(e){ next(e); }
}

// ── Relatório por Turma ───────────────────────────────────────
async function porTurma(req, res, next) {
  try {
    const { turma_id } = req.params;
    const turma = turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    const alunos = turmaRepo.getAlunos(turma_id).map(mat => {
      const u = userRepo.findById(mat.aluno_id);
      if (!u) return null;
      const rs = respostaRepo.findByAluno(u.id);
      const historico = rs.map(r => { const q = questaoRepo.findById(r.questao_id); return q ? { tri:q.tri, score:r.score } : null; }).filter(Boolean);
      const theta = triService.estimateTheta(historico);
      const nivel = triService.thetaToLevel(theta);
      return {
        id: u.id, nome: u.nome, email: u.email, theta, nivel: nivel.label, emoji: nivel.emoji,
        total_respostas: rs.length,
        corretas: rs.filter(r => r.is_correct).length,
        taxa_acerto: rs.length > 0 ? Math.round(rs.filter(r => r.is_correct).length / rs.length * 100) : 0,
        xp_total: rs.reduce((s, r) => s + (r.xp_ganho||0), 0),
        joined_at: mat.joined_at,
      };
    }).filter(Boolean).sort((a, b) => b.theta - a.theta);

    const disc = discRepo.findById(turma.disciplina_id);
    res.json({ turma: { ...turma, disciplina: disc?.nome }, alunos, total: alunos.length });
  } catch(e){ next(e); }
}

// ── Relatório Admin global ────────────────────────────────────
async function adminGeral(req, res, next) {
  try {
    const usuarios   = userRepo.findAll();
    const questoes   = questaoRepo.findAll();
    const respostas  = respostaRepo.findAll();
    const disciplinas= discRepo.findAll();
    const turmas     = turmaRepo.findAll();

    const ativos    = usuarios.filter(u => u.status === 'ativo');
    const pendentes = usuarios.filter(u => u.status === 'pendente');

    // Distribuição de perfil
    const perPerfil = ativos.reduce((acc, u) => { acc[u.perfil] = (acc[u.perfil]||0) + 1; return acc; }, {});

    // Média de theta dos alunos
    const alunos = ativos.filter(u => u.perfil === 'aluno');
    let thetaTotal = 0;
    const alunoStats = alunos.map(u => {
      const rs = respostaRepo.findByAluno(u.id);
      const historico = rs.map(r => { const q = questaoRepo.findById(r.questao_id); return q ? { tri:q.tri, score:r.score } : null; }).filter(Boolean);
      const theta = triService.estimateTheta(historico);
      thetaTotal += theta;
      return { id: u.id, nome: u.nome, theta, total_respostas: rs.length };
    });

    res.json({
      usuarios: {
        total: usuarios.length, ativos: ativos.length, pendentes: pendentes.length,
        por_perfil: perPerfil,
      },
      conteudo: {
        disciplinas: disciplinas.length,
        turmas: turmas.length,
        questoes: questoes.length,
        questoes_calibradas: questoes.filter(q => q.tri?.status === 'calibrado').length,
      },
      atividade: {
        total_respostas: respostas.length,
        taxa_acerto: respostas.length > 0 ? Math.round(respostas.filter(r => r.is_correct).length / respostas.length * 100) : 0,
        theta_medio_alunos: alunos.length > 0 ? Math.round(thetaTotal / alunos.length * 100) / 100 : 0,
      },
      top_alunos: alunoStats.sort((a, b) => b.theta - a.theta).slice(0, 5),
    });
  } catch(e){ next(e); }
}


// ════════════════════════════════════════════════════════════════
// BOLETIM DO ALUNO
// ════════════════════════════════════════════════════════════════
/**
 * Boletim individual: turma → disciplinas → avaliações → notas
 * GET /relatorios/boletim/aluno/:aluno_id?
 * Aluno vê o próprio. Professor/admin podem ver qualquer aluno.
 */
async function boletimAluno(req, res, next) {
  try {
    const targetId = req.params.aluno_id ? Number(req.params.aluno_id) : req.user.id;

    // Aluno só pode ver o próprio boletim
    if (req.user.perfil === 'aluno' && targetId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const aluno = userRepo.findById(targetId);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    // Turmas do aluno
    const matriculas = turmaRepo.getTurmasAluno(targetId);
    const turmasData = [];

    for (const mat of matriculas) {
      const turma = turmaRepo.findById(mat.turma_id);
      if (!turma) continue;

      // Disciplinas da turma
      const discIds = tdRepo.disciplinaIds(turma.id);
      const disciplinasData = [];

      for (const discId of discIds) {
        const disc = discRepo.findById(discId);
        if (!disc) continue;

        // Avaliações da turma (ou da disciplina) que o aluno tem acesso
        const avsDisc = avaliacaoRepo.findByTurma(turma.id)
          .filter(av => av.status === 'publicada');

        // Também busca avaliações por disciplina
        const avsDisciplina = avaliacaoRepo.findByDisciplina ? avaliacaoRepo.findByDisciplina(discId) : [];
        const avsTodas = [...avsDisc, ...avsDisciplina.filter(a => !avsDisc.find(b => b.id === a.id))];

        const avaliacoesAluno = avsTodas.map(av => {
          const tentativas = avaliacaoRepo.findTentativaAlunoAvalia(targetId, av.id)
            .filter(t => t.status === 'concluida')
            .sort((a, b) => (b.nota || 0) - (a.nota || 0));

          const melhorTentativa = tentativas[0] || null;
          const melhorNota = melhorTentativa?.nota ?? null;
          const aprovado   = melhorNota !== null ? melhorNota >= (av.nota_minima || 6) : null;

          return {
            id: av.id,
            titulo: av.titulo,
            tipo: av.tipo,
            nota_minima: av.nota_minima || 6,
            peso: av.peso || 10,
            tempo_limite: av.tempo_limite,
            total_tentativas: tentativas.length,
            tentativas_permitidas: av.tentativas_permitidas || 1,
            melhor_nota: melhorNota,
            aprovado,
            status_aluno: tentativas.length === 0 ? 'nao_realizada' : aprovado ? 'aprovado' : 'reprovado',
            realizada_em: melhorTentativa?.concluida_em || null,
          };
        });

        // Média ponderada da disciplina
        const realizadas = avaliacoesAluno.filter(a => a.melhor_nota !== null);
        let mediaDisciplina = null, pesoTotal = 0, somaPonderada = 0;
        if (realizadas.length > 0) {
          for (const a of realizadas) {
            somaPonderada += (a.melhor_nota || 0) * (a.peso || 10);
            pesoTotal += (a.peso || 10);
          }
          mediaDisciplina = pesoTotal > 0 ? Math.round(somaPonderada / pesoTotal * 100) / 100 : null;
        }

        // Situação nas trilhas
        const trilhasDaDisciplina = trilhaRepo.findByDisciplina(discId);
        const progressoTrilhas = trilhasDaDisciplina.map(t => {
          const resps = respostaRepo.findByAluno(targetId).filter(r => {
            const q = questaoRepo.findById(r.questao_id);
            return q && q.trilha_id === t.id;
          });
          const qs = questaoRepo.findByTrilha(t.id);
          const progresso = qs.length > 0 ? Math.round(resps.length / qs.length * 100) : 0;
          return { id: t.id, nome: t.nome, progresso: Math.min(100, progresso), total_questoes: qs.length, respondidas: resps.length };
        });

        disciplinasData.push({
          id: disc.id, nome: disc.nome, codigo: disc.codigo, carga_horaria: disc.carga_horaria,
          avaliacoes: avaliacoesAluno,
          media_disciplina: mediaDisciplina,
          situacao: mediaDisciplina === null ? 'em_andamento' : mediaDisciplina >= 6 ? 'aprovado' : 'reprovado',
          trilhas: progressoTrilhas,
          total_avaliacoes: avaliacoesAluno.length,
          avaliacoes_realizadas: realizadas.length,
        });
      }

      // Média geral da turma
      const discComMedia = disciplinasData.filter(d => d.media_disciplina !== null);
      const mediaGeral = discComMedia.length > 0
        ? Math.round(discComMedia.reduce((s, d) => s + d.media_disciplina, 0) / discComMedia.length * 100) / 100
        : null;

      // Histórico de respostas para theta
      const historico = respostaRepo.findByAluno(targetId).map(r => {
        const q = questaoRepo.findById(r.questao_id);
        return q ? { tri: q.tri, score: r.score } : null;
      }).filter(Boolean);
      const theta = triService.estimateTheta(historico);
      const nivel = triService.thetaToLevel(theta);

      turmasData.push({
        id: turma.id, nome: turma.nome, descricao: turma.descricao,
        joined_at: mat.joined_at,
        disciplinas: disciplinasData,
        media_geral: mediaGeral,
        situacao_geral: mediaGeral === null ? 'em_andamento' : mediaGeral >= 6 ? 'aprovado' : 'reprovado',
        theta: Math.round(theta * 100) / 100,
        nivel: nivel.label,
        nivel_emoji: nivel.emoji,
      });
    }

    const { senha_hash, ...alunoSafe } = aluno;
    res.json({ aluno: alunoSafe, turmas: turmasData, gerado_em: new Date().toISOString() });
  } catch(e){ next(e); }
}

/**
 * Boletim da turma (professor): todos os alunos, todas as disciplinas
 * GET /relatorios/boletim/turma/:turma_id
 */
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
        const avsDisc = avaliacoesTurma.filter(av => !av.disciplina_id || av.disciplina_id === disc.id);
        const notas = avsDisc.map(av => {
          const melhor = avaliacaoRepo.findTentativaAlunoAvalia(aluno.id, av.id)
            .filter(t => t.status === 'concluida').sort((a, b) => (b.nota||0)-(a.nota||0))[0];
          return melhor ? { av_id: av.id, titulo: av.titulo, nota: melhor.nota, aprovado: melhor.aprovado, peso: av.peso || 10 } : null;
        }).filter(Boolean);

        const pesoTotal = notas.reduce((s, n) => s + n.peso, 0);
        const media = pesoTotal > 0 ? Math.round(notas.reduce((s, n) => s + n.nota * n.peso, 0) / pesoTotal * 100) / 100 : null;

        return { disc_id: disc.id, disc_nome: disc.nome, media, notas, situacao: media === null ? '-' : media >= 6 ? 'A' : 'R' };
      });

      const historico = respostaRepo.findByAluno(aluno.id).map(r => {
        const q = questaoRepo.findById(r.questao_id);
        return q ? { tri: q.tri, score: r.score } : null;
      }).filter(Boolean);
      const theta = triService.estimateTheta(historico);
      const nivel = triService.thetaToLevel(theta);

      const discComMedia = disciplinasAluno.filter(d => d.media !== null);
      const mediaGeral = discComMedia.length > 0
        ? Math.round(discComMedia.reduce((s, d) => s + d.media, 0) / discComMedia.length * 100) / 100 : null;

      const { senha_hash, ...safe } = aluno;
      return { ...safe, disciplinas: disciplinasAluno, media_geral: mediaGeral, theta: Math.round(theta*100)/100, nivel: nivel.label, nivel_emoji: nivel.emoji };
    }).filter(Boolean).sort((a, b) => (b.media_geral||0) - (a.media_geral||0));

    // Estatísticas da turma
    const comMedia = alunosBoletim.filter(a => a.media_geral !== null);
    const mediaGeral = comMedia.length > 0 ? Math.round(comMedia.reduce((s,a) => s+a.media_geral, 0)/comMedia.length*100)/100 : null;
    const aprovados  = comMedia.filter(a => a.media_geral >= 6).length;

    res.json({
      turma: { ...turma, disciplinas: disciplinas.map(d=>({id:d.id,nome:d.nome})), avaliacoes: avaliacoesTurma.map(a=>({id:a.id,titulo:a.titulo,tipo:a.tipo})) },
      alunos: alunosBoletim,
      estatisticas: { total_alunos: alunosBoletim.length, media_geral: mediaGeral, aprovados, reprovados: comMedia.length-aprovados, taxa_aprovacao: comMedia.length>0?Math.round(aprovados/comMedia.length*100):0 },
      gerado_em: new Date().toISOString(),
    });
  } catch(e){ next(e); }
}

module.exports = { profGeral, porTurma, adminGeral, boletimAluno, boletimTurma };
