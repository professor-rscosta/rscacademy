/**
 * Boletim Controller
 * Professor: boletim de uma turma (todos os alunos x todas as avaliações)
 * Aluno: boletim individual (todas as avaliações + notas + situação)
 */
const avaliacaoRepo = require('../repositories/avaliacao.repository');
const turmaRepo     = require('../repositories/turma.repository');
const userRepo      = require('../repositories/user.repository');
const discRepo      = require('../repositories/disciplina.repository');
const tdRepo        = require('../repositories/turma_disciplina.repository');
const trilhaRepo    = require('../repositories/trilha.repository');
const respostaRepo  = require('../repositories/resposta.repository');
const questaoRepo   = require('../repositories/questao.repository');
const triService    = require('../services/tri.service');

// ── BOLETIM DO PROFESSOR (turma completa) ─────────────────────
async function boletimTurma(req, res, next) {
  try {
    const { turma_id } = req.params;
    const turma = await turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    // Verificar acesso
    if (req.user.perfil === 'professor' && turma.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    // Avaliações da turma (publicadas e encerradas)
    const _avsTurma = await avaliacaoRepo.findByTurma(turma_id).catch(() => []);
    const avaliacoes = (_avsTurma||[])
      .filter(a => ['publicada','encerrada','concluida'].includes(a.status||''))
      .sort((a,b) => new Date(a.disponivel_em||0) - new Date(b.disponivel_em||0));

    // Alunos matriculados
    const matriculas = await turmaRepo.getAlunos(turma_id);
    const _alunosRaw = await Promise.all(matriculas.map(async m => {
      const u = await userRepo.findById(m.aluno_id);
      if (!u) return null;
      const { senha_hash, ...safe } = u;
      return { ...safe, joined_at: m.joined_at };
    }));
    const alunos = _alunosRaw.filter(Boolean).sort((a,b) => a.nome.localeCompare(b.nome));

    // Disciplinas da turma
    const discIds = await tdRepo.disciplinaIds(turma_id);
    const disciplinas = (await Promise.all(discIds.map(id => discRepo.findById(id)))).filter(Boolean);

    // Montar matriz: aluno x avaliação
    const linhas = await Promise.all(alunos.map(async aluno => {

      const notas = {};
      let somaNotas = 0, totalPeso = 0, totalAvs = 0;

      for (const av of avaliacoes) {
        const tentativas = await avaliacaoRepo.findTentativaAlunoAvalia(aluno.id, av.id)
          .filter(t => t.status === 'concluida');
        if (tentativas.length === 0) {
          notas[av.id] = { nota: null, aprovado: null, tentativas: 0, status: 'pendente' };
        } else {
          const melhor = tentativas.reduce((b, t) => (t.nota||0) > (b.nota||0) ? t : b, tentativas[0]);
          const nota = melhor.nota || 0;
          const aprovado = nota >= (av.nota_minima || 6);
          notas[av.id] = { nota, aprovado, tentativas: tentativas.length, status: aprovado ? 'aprovado' : 'reprovado' };
          const peso = av.peso || 10;
          somaNotas += nota * peso;
          totalPeso += peso;
          totalAvs++;
        }
      }

      const mediaGeral = totalPeso > 0 ? Math.round(somaNotas / totalPeso * 100) / 100 : null;
      const notasValidas = Object.values(notas).filter(n => n.nota !== null);
      const aprovado = notasValidas.length > 0 && notasValidas.every(n => n.aprovado);

      // TRI theta do aluno
      const respostas = await respostaRepo.findByAluno(aluno.id);
      const _histRaw = await Promise.all(respostas.map(async r => {
        const q = await questaoRepo.findById(r.questao_id).catch(() => null);
        return q?.tri ? { tri: q.tri, score: r.score || 0 } : null;
      }));
      const historico = _histRaw.filter(Boolean);
      const theta = triService.estimateTheta(historico);
      const nivel = triService.thetaToLevel(theta);

      return { aluno, notas, media_geral: mediaGeral, aprovado, theta, nivel };
    
}));

    // Estatísticas por avaliação
    const statsAvaliacoes = avaliacoes.map(av => {
      const notas = linhas.map(l => l.notas[av.id]?.nota).filter(n => n !== null);
      const media = notas.length > 0 ? Math.round(notas.reduce((a,b)=>a+b,0)/notas.length*100)/100 : null;
      const aprovados = linhas.filter(l => l.notas[av.id]?.aprovado).length;
      return { avaliacao_id: av.id, media, aprovados, total_responderam: notas.length, taxa_aprovacao: notas.length > 0 ? Math.round(aprovados/notas.length*100) : 0 };
    });

    res.json({ turma, avaliacoes, alunos: linhas, disciplinas, stats_avaliacoes: statsAvaliacoes, total_alunos: alunos.length });
  } catch(e){ next(e); }
}

// ── BOLETIM DO ALUNO (individual) ─────────────────────────────
async function boletimAluno(req, res, next) {
  try {
    const aluno_id = Number(req.params.aluno_id || req.user.id);
    if (req.user.perfil === 'aluno' && aluno_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    const aluno = await userRepo.findById(aluno_id);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    const mats = await turmaRepo.getTurmasAluno(aluno_id).catch(() => []);
    const turmaIds = (mats||[]).map(m => Number(m.turma_id));
    if (turmaIds.length === 0)
      return res.json({ aluno, turmas: [], resumo: { media_geral: null, total_aprovacoes: 0 } });

    const resultado = [];

    for (const tid of turmaIds) {
      try {
        const turma = await turmaRepo.findById(tid);
        if (!turma) continue;

        const discIds = await tdRepo.disciplinaIds(tid).catch(() => []);
        const disciplinas = (await Promise.all(discIds.map(id => discRepo.findById(id).catch(() => null)))).filter(Boolean);

        // Get all avaliacoes for this turma
        const avsRaw = await avaliacaoRepo.findByTurma(tid).catch(() => []);
        const avaliacoes = (avsRaw||[]).filter(a => ['publicada','encerrada','concluida'].includes(a.status||''));

        // Per-discipline data
        const disciplinasData = await Promise.all(disciplinas.map(async disc => {
          try {
            // Filter avaliacoes for this discipline
            const avsDisc = avaliacoes.filter(av => !av.disciplina_id || Number(av.disciplina_id) === disc.id);

            // Get aluno's best nota per avaliacao
            const notasAv = (await Promise.all(avsDisc.map(async av => {
              try {
                const tents = await avaliacaoRepo.findTentativaAlunoAvalia(aluno_id, av.id).catch(() => []);
                const conc = (tents||[]).filter(t => t.status === 'concluida').sort((a,b) => (b.nota||0)-(a.nota||0));
                if (!conc.length) return null;
                return { av_id: av.id, titulo: av.titulo, nota: conc[0].nota || 0, aprovado: conc[0].aprovado || false };
              } catch { return null; }
            }))).filter(Boolean);

            const somaNotas = notasAv.reduce((s, n) => s + (n.nota||0), 0);
            const media = notasAv.length > 0 ? round2(somaNotas / notasAv.length) : null;
            const aprovado = media !== null && media >= (turma.nota_minima || 6);

            return {
              id: disc.id, nome: disc.nome, codigo: disc.codigo,
              avaliacoes: notasAv, media, aprovado,
              situacao: media === null ? 'Em andamento' : aprovado ? 'Aprovado' : 'Reprovado',
            };
          } catch { return null; }
        }));

        const discsValidas = disciplinasData.filter(Boolean);
        const somaMedia = discsValidas.filter(d => d.media !== null).reduce((s, d) => s + (d.media||0), 0);
        const totalComMedia = discsValidas.filter(d => d.media !== null).length;
        const mediaGeral = totalComMedia > 0 ? round2(somaMedia / totalComMedia) : null;

        resultado.push({
          turma: { id: turma.id, nome: turma.nome },
          disciplinas: discsValidas,
          media_geral: mediaGeral,
          aprovacoes: discsValidas.filter(d => d.aprovado).length,
        });
      } catch(e) {
        console.error('[boletimAluno turma]', tid, e.message);
      }
    }

    const totalAprovacoes = resultado.reduce((s, t) => s + t.aprovacoes, 0);
    const todasMedias = resultado.flatMap(t => t.disciplinas.map(d => d.media)).filter(m => m !== null);
    const mediaGlobal = todasMedias.length > 0 ? round2(todasMedias.reduce((a,b)=>a+b,0) / todasMedias.length) : null;

    const { senha_hash, ...alunoSafe } = aluno;
    res.json({
      aluno: alunoSafe, turmas: resultado,
      resumo: { media_geral: mediaGlobal, total_aprovacoes: totalAprovacoes },
    });
  } catch(e) {
    console.error('[boletimAluno 500]', e.message);
    next(e);
  }
}


