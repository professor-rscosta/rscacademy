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
    const turma = turmaRepo.findById(turma_id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });

    // Verificar acesso
    if (req.user.perfil === 'professor' && turma.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    // Avaliações da turma (publicadas e encerradas)
    const avaliacoes = avaliacaoRepo.findByTurma(turma_id)
      .filter(a => ['publicada','encerrada'].includes(a.status))
      .sort((a,b) => new Date(a.disponivel_em) - new Date(b.disponivel_em));

    // Alunos matriculados
    const matriculas = turmaRepo.getAlunos(turma_id);
    const alunos = matriculas.map(m => {
      const u = userRepo.findById(m.aluno_id);
      if (!u) return null;
      const { senha_hash, ...safe } = u;
      return { ...safe, joined_at: m.joined_at };
    }).filter(Boolean).sort((a,b) => a.nome.localeCompare(b.nome));

    // Disciplinas da turma
    const discIds = tdRepo.disciplinaIds(turma_id);
    const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean);

    // Montar matriz: aluno x avaliação
    const linhas = alunos.map(aluno => {
      const notas = {};
      let somaNotas = 0, totalPeso = 0, totalAvs = 0;

      for (const av of avaliacoes) {
        const tentativas = avaliacaoRepo.findTentativaAlunoAvalia(aluno.id, av.id)
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
      const respostas = respostaRepo.findByAluno(aluno.id);
      const historico = respostas.map(r => {
        const q = questaoRepo.findById(r.questao_id);
        return q ? { tri: q.tri, score: r.score } : null;
      }).filter(Boolean);
      const theta = triService.estimateTheta(historico);
      const nivel = triService.thetaToLevel(theta);

      return { aluno, notas, media_geral: mediaGeral, aprovado, theta, nivel };
    });

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
    const aluno_id = req.params.aluno_id || req.user.id;

    // Apenas o próprio aluno ou prof/admin
    if (req.user.perfil === 'aluno' && Number(aluno_id) !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    const aluno = userRepo.findById(aluno_id);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    // Turmas do aluno
    const turmaIds = turmaRepo.getTurmasAluno(aluno_id).map(m => m.turma_id);
    if (turmaIds.length === 0) return res.json({ aluno, turmas: [], resumo: { media_geral: null, total_aprovacoes: 0 } });

    const resultado = [];

    for (const tid of turmaIds) {
      const turma = turmaRepo.findById(tid);
      if (!turma) continue;

      const discIds = tdRepo.disciplinaIds(tid);
      const disciplinas = discIds.map(id => discRepo.findById(id)).filter(Boolean);

      // Avaliações da turma (publicadas/encerradas)
      const avaliacoes = avaliacaoRepo.findByTurma(tid)
        .filter(a => ['publicada','encerrada'].includes(a.status))
        .sort((a,b) => new Date(a.disponivel_em) - new Date(b.disponivel_em));

      // Notas do aluno em cada avaliação
      let somaNotas = 0, totalPeso = 0;
      const notasAv = avaliacoes.map(av => {
        const tentativas = avaliacaoRepo.findTentativaAlunoAvalia(aluno_id, av.id)
          .filter(t => t.status === 'concluida')
          .sort((a,b) => (b.nota||0) - (a.nota||0));

        if (tentativas.length === 0)
          return { av_id: av.id, titulo: av.titulo, tipo: av.tipo, nota_minima: av.nota_minima, peso: av.peso||10, nota: null, aprovado: null, tentativas: 0, encerra_em: av.encerra_em, disponivel_em: av.disponivel_em };

        const melhor = tentativas[0];
        const nota = melhor.nota || 0;
        const aprovado = nota >= (av.nota_minima || 6);
        const peso = av.peso || 10;
        somaNotas += nota * peso;
        totalPeso += peso;

        return { av_id: av.id, titulo: av.titulo, tipo: av.tipo, nota_minima: av.nota_minima, peso, nota, aprovado, tentativas: tentativas.length, melhor_nota: nota, historico_tentativas: tentativas.map(t => ({ nota: t.nota, concluida_em: t.concluida_em, aprovado: (t.nota||0) >= (av.nota_minima||6) })), encerra_em: av.encerra_em, disponivel_em: av.disponivel_em };
      });

      const media = totalPeso > 0 ? Math.round(somaNotas / totalPeso * 100) / 100 : null;
      const avaliadas = notasAv.filter(n => n.nota !== null);
      const aprovadas = avaliadas.filter(n => n.aprovado).length;
      const pendentes = notasAv.filter(n => n.nota === null);

      // Desempenho nas trilhas
      const trilhaIds = discIds.flatMap(did => trilhaRepo.findByDisciplina(did).map(t => t.id));
      const respostas = respostaRepo.findByAluno(aluno_id);
      const respostasTrilhas = respostas.filter(r => {
        const q = questaoRepo.findById(r.questao_id);
        return q && trilhaIds.includes(q.trilha_id);
      });
      const totalRespostas = respostasTrilhas.length;
      const corretas = respostasTrilhas.filter(r => r.is_correct).length;

      resultado.push({
        turma,
        disciplinas,
        avaliacoes: notasAv,
        media_turma: media,
        aprovadas_turma: aprovadas,
        total_avaliacoes: avaliacoes.length,
        pendentes_count: pendentes.length,
        situacao: avaliadas.length === 0 ? 'sem_notas' : aprovadas === avaliadas.length ? 'aprovado' : aprovadas > 0 ? 'parcial' : 'reprovado',
        desempenho_trilhas: { total: totalRespostas, corretas, taxa: totalRespostas > 0 ? Math.round(corretas/totalRespostas*100) : 0 },
      });
    }

    // Theta / nível geral
    const todasRespostas = respostaRepo.findByAluno(aluno_id);
    const historico = todasRespostas.map(r => {
      const q = questaoRepo.findById(r.questao_id);
      return q ? { tri: q.tri, score: r.score } : null;
    }).filter(Boolean);
    const theta = triService.estimateTheta(historico);
    const nivel = triService.thetaToLevel(theta);

    // Resumo geral
    const todasNotas = resultado.flatMap(t => t.avaliacoes.filter(a => a.nota !== null).map(a => ({ nota: a.nota, peso: a.peso })));
    const sumN = todasNotas.reduce((s,a) => s + a.nota * a.peso, 0);
    const sumP = todasNotas.reduce((s,a) => s + a.peso, 0);
    const mediaGeral = sumP > 0 ? Math.round(sumN / sumP * 100) / 100 : null;

    const { senha_hash, ...safeAluno } = aluno;
    res.json({ aluno: safeAluno, turmas: resultado, theta, nivel, resumo: { media_geral: mediaGeral, total_aprovacoes: resultado.reduce((s,t)=>s+t.aprovadas_turma,0), total_avaliacoes: resultado.reduce((s,t)=>s+t.total_avaliacoes,0), total_respondidas: todasNotas.length, xp_total: todasRespostas.reduce((s,r)=>s+(r.xp_ganho||0),0) } });
  } catch(e){ next(e); }
}

module.exports = { boletimTurma, boletimAluno };
