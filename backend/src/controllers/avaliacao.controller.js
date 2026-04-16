/**
 * Avaliacao Controller — RBAC completo
 * ALUNO: vê apenas avaliações das turmas em que está matriculado
 * PROFESSOR: gerencia suas avaliações
 * ADMIN: acesso total
 */
const avaliacaoRepo = require('../repositories/avaliacao.repository');
const questaoRepo   = require('../repositories/questao.repository');
const respostaRepo  = require('../repositories/resposta.repository');
const userRepo      = require('../repositories/user.repository');
const turmaRepo     = require('../repositories/turma.repository');
const triService    = require('../services/tri.service');
const aiService     = require('../services/ai.service');
const gamifService  = require('../services/gamification.service');

// ── LISTAR avaliações ─────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { professor_id, disciplina_id, turma_id } = req.query;
    let avs;

    if (req.user.perfil === 'aluno') {
      // Aluno: apenas avaliações das suas turmas
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      if (!turmaIds.length) return res.json({ avaliacoes: [] });
      // Avaliacoes diretas (turma_id) + vinculadas via turma_avaliacoes
      const diretas = turmaIds.flatMap(tid => avaliacaoRepo.findByTurma(tid));
      const { dbFindWhere: fw } = require('../database/init');
      const vinculadas = turmaIds.flatMap(tid =>
        fw('turma_avaliacoes', r => r.turma_id === Number(tid))
          .map(v => avaliacaoRepo.findById(v.avaliacao_id)).filter(Boolean)
      );
      avs = [...diretas, ...vinculadas]
        .filter(a => a.status === 'publicada');
      // Dedup
      const seen = new Set();
      avs = avs.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
    } else if (professor_id) {
      avs = avaliacaoRepo.findByProfessor(professor_id);
    } else if (disciplina_id) {
      avs = avaliacaoRepo.findByDisciplina(disciplina_id);
    } else if (turma_id) {
      avs = avaliacaoRepo.findByTurma(turma_id);
    } else if (req.user.perfil === 'professor') {
      avs = avaliacaoRepo.findByProfessor(req.user.id);
    } else {
      avs = avaliacaoRepo.findAll();
    }

    // Enriquecer com info do aluno
    const enriched = avs.map(a => {
      const numQ = (a.questoes || []).length;
      let tentativas_feitas = 0, minha_nota = null;
      if (req.user.perfil === 'aluno') {
        const ts = avaliacaoRepo.findTentativaAlunoAvalia(req.user.id, a.id);
        tentativas_feitas = ts.length;
        const conc = ts.filter(t => t.status === 'concluida');
        if (conc.length > 0) minha_nota = Math.max(...conc.map(t => t.nota || 0));
      }
      return { ...a, total_questoes: numQ, tentativas_feitas, minha_nota };
    });

    res.json({ avaliacoes: enriched });
  } catch(e){ next(e); }
}

// ── DETALHE avaliação ─────────────────────────────────────────
async function getById(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });

    if (req.user.perfil === 'aluno') {
      // Verificar se a avaliação é da turma do aluno
      const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
      if (av.turma_id && !turmaIds.includes(av.turma_id))
        return res.status(403).json({ error: 'Esta avaliação não pertence à sua turma.' });
    }

    const questoes = (av.questoes || []).map(qc => {
      const q = questaoRepo.findById(qc.questao_id);
      if (!q) return null;
      if (req.user.perfil !== 'aluno') return { ...q, peso: qc.peso };
      // Para aluno: não revelar gabaritos
      const { gabarito, ...sem } = q;
      return { ...sem, peso: qc.peso };
    }).filter(Boolean);

    const tentativas = req.user.perfil === 'aluno'
      ? avaliacaoRepo.findTentativaAlunoAvalia(req.user.id, av.id)
      : [];

    res.json({ avaliacao: { ...av, questoes_completas: questoes, tentativas_aluno: tentativas } });
  } catch(e){ next(e); }
}

// ── CRIAR avaliação ───────────────────────────────────────────
async function create(req, res, next) {
  try {
    const { titulo, descricao, tipo, disciplina_id, turma_id, questoes, tempo_limite, tentativas_permitidas, nota_minima, peso, disponivel_em, encerra_em } = req.body;
    if (!titulo) return res.status(400).json({ error: 'titulo é obrigatório.' });

    if (req.user.perfil === 'professor' && turma_id) {
      const turma = turmaRepo.findById(turma_id);
      if (turma && turma.professor_id !== req.user.id)
        return res.status(403).json({ error: 'Você não é o professor desta turma.' });
    }

    const av = avaliacaoRepo.create({
      titulo, descricao: descricao||'', tipo: tipo||'prova',
      professor_id: req.user.id,
      disciplina_id: disciplina_id ? Number(disciplina_id) : null,
      turma_id: turma_id ? Number(turma_id) : null,
      questoes: questoes || [],
      tempo_limite: tempo_limite ? Number(tempo_limite) : 60,
      tentativas_permitidas: tentativas_permitidas ? Number(tentativas_permitidas) : 1,
      nota_minima: nota_minima ? Number(nota_minima) : 6.0,
      peso: peso ? Number(peso) : 10,
      status: 'rascunho',
      disponivel_em: disponivel_em || new Date().toISOString(),
      encerra_em: encerra_em || new Date(Date.now() + 7*86400000).toISOString(),
    });
    res.status(201).json({ avaliacao: av });
  } catch(e){ next(e); }
}

// ── EDITAR avaliação ──────────────────────────────────────────
async function update(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    const updated = avaliacaoRepo.update(req.params.id, req.body);
    res.json({ avaliacao: updated });
  } catch(e){ next(e); }
}

// ── PUBLICAR avaliação ────────────────────────────────────────
async function publicar(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    if (!av.questoes?.length) return res.status(400).json({ error: 'Adicione ao menos 1 questão antes de publicar.' });
    const updated = avaliacaoRepo.update(req.params.id, { status: 'publicada' });
    res.json({ avaliacao: updated, message: 'Avaliação publicada com sucesso!' });
  } catch(e){ next(e); }
}

// ── REMOVER avaliação ─────────────────────────────────────────
async function remove(req, res, next) {
  try { avaliacaoRepo.remove(req.params.id); res.json({ message: 'Avaliação removida.' }); }
  catch(e){ next(e); }
}

// ── INICIAR tentativa (aluno) ─────────────────────────────────
async function iniciar(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    if (av.status !== 'publicada') return res.status(400).json({ error: 'Avaliação não está publicada.' });

    // Verificar se é da turma do aluno (direto ou via turma_avaliacoes)
    const turmaIds = turmaRepo.getTurmasAluno(req.user.id).map(m => m.turma_id);
    if (av.turma_id || turmaIds.length > 0) {
      const { dbFindWhere: fw } = require('../database/init');
      const vinculadaATurmaDoAluno = av.turma_id
        ? turmaIds.includes(av.turma_id)
        : false;
      const vinculadaViaNtoN = turmaIds.some(tid =>
        fw('turma_avaliacoes', r => r.avaliacao_id === av.id && r.turma_id === tid).length > 0
      );
      if (!vinculadaATurmaDoAluno && !vinculadaViaNtoN && av.turma_id)
        return res.status(403).json({ error: 'Esta avaliação não pertence à sua turma.' });
    }

    // Verificar janela de tempo
    const agora = new Date();
    if (av.disponivel_em) {
      const abertura = new Date(av.disponivel_em);
      if (agora < abertura) {
        const dtStr = abertura.toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        return res.status(403).json({ error: 'Esta avaliacao ainda nao foi liberada. Disponivel a partir de: ' + dtStr, codigo: 'ANTES_ABERTURA', abertura: av.disponivel_em });
      }
    }
    if (av.encerra_em) {
      const encerramento = new Date(av.encerra_em);
      if (agora > encerramento) {
        return res.status(403).json({ error: 'O prazo desta avaliacao foi encerrado.', codigo: 'APOS_ENCERRAMENTO', encerramento: av.encerra_em });
      }
    }

    const tentativas = avaliacaoRepo.findTentativaAlunoAvalia(req.user.id, av.id);
    if (tentativas.length >= (av.tentativas_permitidas || 1))
      return res.status(403).json({ error: 'Numero maximo de tentativas atingido.' });

    const tentativaAberta = tentativas.find(t => t.status === 'em_andamento');

    // ── Randomização das questões ──────────────────────────
    // Fisher-Yates shuffle
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const questoesBase = av.randomizar_questoes
      ? shuffle(av.questoes || [])
      : (av.questoes || []);

    // Montar questões com alternativas randomizadas SEM gabaritos
    const questoesCompletas = questoesBase.map(qc => {
      const q = questaoRepo.findById(qc.questao_id);
      if (!q) return null;
      const { gabarito, ...semGabarito } = q;

      // Randomizar alternativas de multipla_escolha mantendo mapeamento
      let mapeamentoAlternativas = null;
      if (av.randomizar_alternativas && q.tipo === 'multipla_escolha' && Array.isArray(q.alternativas)) {
        const indices = q.alternativas.map((_, i) => i);
        const indicesEmbaralhados = shuffle(indices);
        const altEmbaralhadas = indicesEmbaralhados.map(i => q.alternativas[i]);
        // mapeamento: posição nova → índice original
        mapeamentoAlternativas = indicesEmbaralhados;
        semGabarito.alternativas = altEmbaralhadas;
      }

      return { ...semGabarito, peso: qc.peso || 1, _mapeamento: mapeamentoAlternativas };
    }).filter(Boolean);

    // Salvar ordem e mapeamentos na tentativa para correção correta
    const ordemQuestoes      = questoesCompletas.map(q => q.id);
    const mapeamentosAlt     = {};
    questoesCompletas.forEach(q => {
      if (q._mapeamento) mapeamentosAlt[q.id] = q._mapeamento;
      delete q._mapeamento; // não enviar ao frontend
    });

    // Calcular tempo restante em segundos
    const tempoTotalSegundos = (av.tempo_limite || 60) * 60;
    let tempoRestanteSegundos = tempoTotalSegundos;
    if (tentativaAberta?.iniciada_em) {
      const decorrido = Math.floor((Date.now() - new Date(tentativaAberta.iniciada_em).getTime()) / 1000);
      tempoRestanteSegundos = Math.max(0, tempoTotalSegundos - decorrido);
    }

    const avaliacaoComQuestoes = { ...av, questoes_completas: questoesCompletas };

    if (tentativaAberta) {
      return res.json({ tentativa: tentativaAberta, avaliacao: avaliacaoComQuestoes, tempo_restante_segundos: tempoRestanteSegundos });
    }

    const tentativa = avaliacaoRepo.createTentativa({
      avaliacao_id: av.id, aluno_id: req.user.id,
      status: 'em_andamento', respostas: [], iniciada_em: new Date().toISOString(),
      ordem_questoes: ordemQuestoes,
      mapeamentos_alternativas: Object.keys(mapeamentosAlt).length > 0 ? mapeamentosAlt : null,
    });
    res.status(201).json({ tentativa, avaliacao: avaliacaoComQuestoes, tempo_restante_segundos: tempoTotalSegundos });
  } catch(e){ next(e); }
}

// ── RESPONDER questão da avaliação (aluno) ────────────────────
async function responderQuestao(req, res, next) {
  try {
    const { tentativa_id, questao_id, resposta } = req.body;
    const tentativa = avaliacaoRepo.findTentativaById(tentativa_id);
    if (!tentativa || tentativa.aluno_id !== req.user.id)
      return res.status(404).json({ error: 'Tentativa não encontrada.' });
    if (tentativa.status !== 'em_andamento')
      return res.status(400).json({ error: 'Tentativa já concluída.' });

    const respostas = [...(tentativa.respostas || [])];
    const idx = respostas.findIndex(r => r.questao_id === questao_id);
    if (idx >= 0) respostas[idx] = { questao_id, resposta };
    else respostas.push({ questao_id, resposta });

    avaliacaoRepo.updateTentativa(tentativa_id, { respostas });
    res.json({ message: 'Resposta salva.', total_respondidas: respostas.length });
  } catch(e){ next(e); }
}

// ── CONCLUIR tentativa (aluno) ────────────────────────────────
async function concluir(req, res, next) {
  try {
    const tentativa = avaliacaoRepo.findTentativaById(req.params.tentativa_id);
    if (!tentativa || tentativa.aluno_id !== req.user.id)
      return res.status(404).json({ error: 'Tentativa não encontrada.' });
    if (tentativa.status === 'concluida')
      return res.status(400).json({ error: 'Tentativa já concluída.' });

    const av = avaliacaoRepo.findById(tentativa.avaliacao_id);
    const questoesConfig = av.questoes || [];
    const respostasAluno = tentativa.respostas || [];
    let pontosBrutos = 0, pesoTotal = 0;
    const respostasCorrigidas = [];

    for (const qc of questoesConfig) {
      const q = questaoRepo.findById(qc.questao_id);
      if (!q) continue;
      const peso = qc.peso || 1;
      pesoTotal += peso;
      const rAluno = respostasAluno.find(r => r.questao_id === q.id);
      let score = 0;

      if (!rAluno) {
        respostasCorrigidas.push({ questao_id: q.id, score: 0, is_correct: false, peso });
        continue;
      }

      if (['dissertativa', 'upload_arquivo'].includes(q.tipo)) {
        try {
          const av_ia = await aiService.evaluateOpenAnswer({ enunciado: q.enunciado, gabarito_criterios: String(q.gabarito), resposta_aluno: String(rAluno.resposta), tipo: q.tipo });
          score = av_ia.score || 0;
        } catch { score = 0.5; }
      } else {
        // Verificar mapeamento de alternativas para correção correta
        let respostaParaCorrigir = rAluno.resposta;
        const mapeamentos = tentativa.mapeamentos_alternativas;
        if (q.tipo === 'multipla_escolha' && mapeamentos && mapeamentos[q.id]) {
          // Converter posição embaralhada → índice original do gabarito
          const mapa = mapeamentos[q.id]; // mapa[posiçãoNova] = índiceOriginal
          if (typeof respostaParaCorrigir === 'number') {
            respostaParaCorrigir = mapa[respostaParaCorrigir]; // converter para índice original
          }
        }
        score = triService.checkResposta(q.tipo, q.gabarito, respostaParaCorrigir) ? 1 : 0;
      }

      pontosBrutos += score * peso;
      respostasCorrigidas.push({ questao_id: q.id, score, is_correct: score >= 0.8, peso });
    }

    const nota = pesoTotal > 0 ? Math.round((pontosBrutos / pesoTotal) * 10 * 100) / 100 : 0;
    const aprovado = nota >= (av.nota_minima || 6);
    const xpGanho = Math.round(nota * 20 + (aprovado ? 100 : 0));

    gamifService.awardXP(req.user.id, xpGanho);
    gamifService.updateStreak(req.user.id);
    const novasMedalhas = gamifService.checkMedals(req.user.id);

    const corretas = respostasCorrigidas.filter(r => r.score >= 0.8).length;
    let feedbackGeral = aprovado ? '✅ Parabéns! Nota ' + nota + '/10.' : '📚 Nota ' + nota + '/10. Continue estudando!';
    try {
      const u = userRepo.findById(req.user.id);
      // Preparar dados detalhados para feedback pedagógico
      const respostasDetalhadas = respostasCorrigidas.map(rc => ({
        ...rc,
        questao: questaoRepo.findById(rc.questao_id),
        resposta_aluno: tentativa.respostas?.find(r => r.questao_id === rc.questao_id)?.resposta,
      }));
      feedbackGeral = await gerarFeedbackPedagogico(u, av, nota, corretas, questoesConfig.length, respostasDetalhadas);
    } catch(feedErr) {
      console.log('[Avaliacao] Feedback IA falhou:', feedErr.message);
    }

    avaliacaoRepo.updateTentativa(tentativa.id, {
      status: 'concluida', nota, aprovado, pontos_brutos: pontosBrutos, peso_total: pesoTotal,
      respostas: respostasCorrigidas, concluida_em: new Date().toISOString(),
      xp_ganho: xpGanho, feedback_geral: feedbackGeral,
    });

    // Montar resposta detalhada com info de questões
    const corretasCount = respostasCorrigidas.filter(r => r.score >= 0.8).length;
    const respostasCompletas = respostasCorrigidas.map(rc => {
      const q = questaoRepo.findById(rc.questao_id);
      const rAluno = tentativa.respostas?.find(r => r.questao_id === rc.questao_id);
      return {
        ...rc,
        questao_enunciado:  q?.enunciado || '',
        questao_tipo:       q?.tipo || '',
        questao_gabarito:   q?.gabarito ?? null,
        questao_alternativas: q?.alternativas || null,
        questao_explicacao: q?.explicacao || '',
        resposta_aluno:     rAluno?.resposta ?? null,
        tempo_gasto_ms:     rAluno?.tempo_gasto_ms || null,
      };
    });

    // Dados complementares para o relatório
    const alunoInfo    = userRepo.findById(req.user.id);
    const turma        = av.turma_id ? turmaRepo.findById(av.turma_id) : null;
    const disc         = av.disciplina_id ? require('../repositories/disciplina.repository').findById(av.disciplina_id) : null;
    const numTentativa = avaliacaoRepo.findTentativasByAvalia(av.id).filter(t => t.aluno_id === req.user.id && t.status === 'concluida').length;

    res.json({
      nota, aprovado, xp_ganho: xpGanho,
      nota_minima:       av.nota_minima,
      avaliacao_titulo:  av.titulo,
      avaliacao_descricao: av.descricao || '',
      aluno_nome:        alunoInfo?.nome || '',
      turma_nome:        turma?.nome || '',
      disciplina_nome:   disc?.nome || '',
      tentativa_numero:  numTentativa,
      concluida_em: new Date().toISOString(),
      respostas: respostasCompletas,
      feedback_geral: feedbackGeral,
      novas_medalhas: novasMedalhas,
      estatisticas: {
        total_questoes: questoesConfig.length,
        corretas: corretasCount,
        erros: questoesConfig.length - corretasCount,
        taxa_acerto: Math.round(corretasCount / questoesConfig.length * 100),
      }
    });
  } catch(e){ next(e); }
}

// ── RESULTADOS (professor) ────────────────────────────────────
async function resultados(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    const tentativas = avaliacaoRepo.findTentativasByAvalia(av.id).filter(t => t.status === 'concluida');
    const porAluno = {};
    for (const t of tentativas) {
      if (!porAluno[t.aluno_id]) porAluno[t.aluno_id] = [];
      porAluno[t.aluno_id].push(t);
    }
    const stats = Object.entries(porAluno).map(([uid, ts]) => {
      const user = userRepo.findById(Number(uid));
      if (!user) return null;
      const melhor = ts.reduce((b, t) => (t.nota||0) > (b.nota||0) ? t : b, ts[0]);
      return { aluno_id: Number(uid), nome: user.nome, email: user.email, total_tentativas: ts.length, melhor_nota: melhor.nota||0, aprovado: melhor.aprovado, ultima_tentativa: melhor.concluida_em };
    }).filter(Boolean).sort((a,b) => b.melhor_nota - a.melhor_nota);
    const notas = stats.map(s => s.melhor_nota);
    const media = notas.length > 0 ? Math.round(notas.reduce((a,b)=>a+b,0)/notas.length*100)/100 : 0;
    res.json({ avaliacao: av, resultados: stats, estatisticas: { total_alunos: stats.length, media_geral: media, aprovados: stats.filter(s=>s.aprovado).length, reprovados: stats.filter(s=>!s.aprovado).length, taxa_aprovacao: stats.length > 0 ? Math.round(stats.filter(s=>s.aprovado).length/stats.length*100) : 0 } });
  } catch(e){ next(e); }
}

// ── MINHAS TENTATIVAS (aluno) ─────────────────────────────────
async function minhasTentativas(req, res, next) {
  try {
    const tentativas = avaliacaoRepo.findTentativasByAluno(req.user.id);
    const enriched = tentativas.map(t => {
      const av = avaliacaoRepo.findById(t.avaliacao_id);
      return { ...t, avaliacao_titulo: av?.titulo, avaliacao_tipo: av?.tipo };
    });
    res.json({ tentativas: enriched });
  } catch(e){ next(e); }
}


// ── CLONAR avaliação ──────────────────────────────────────────
async function clonar(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    const { turma_id, titulo } = req.body;

    const clone = avaliacaoRepo.create({
      ...av,
      id: undefined,
      titulo: titulo || av.titulo + ' (cópia)',
      professor_id: req.user.id,
      turma_id: turma_id ? Number(turma_id) : av.turma_id,
      status: 'rascunho',
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ avaliacao: clone, message: 'Avaliação clonada com sucesso!' });
  } catch(e){ next(e); }
}

// ── VINCULAR avaliação a turma(s) ────────────────────────────
async function vincularTurmas(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });

    const { turma_ids } = req.body;
    if (!Array.isArray(turma_ids) || turma_ids.length === 0)
      return res.status(400).json({ error: 'turma_ids é obrigatório.' });

    const { dbInsert, dbDeleteWhere, dbFindWhere } = require('../database/init');
    const T = 'turma_avaliacoes';

    // Remover vínculos anteriores e recriar
    dbDeleteWhere(T, r => r.avaliacao_id === av.id);
    const vinculados = [];
    for (const tid of turma_ids) {
      dbInsert(T, { avaliacao_id: av.id, turma_id: Number(tid), vinculado_em: new Date().toISOString() });
      vinculados.push(Number(tid));
    }

    // Também atualizar turma_id principal se só uma turma
    if (turma_ids.length === 1) avaliacaoRepo.update(av.id, { turma_id: Number(turma_ids[0]) });

    res.json({ message: `Avaliação vinculada a ${vinculados.length} turma(s).`, turmas: vinculados });
  } catch(e){ next(e); }
}

// ── LISTAR turmas de uma avaliação ────────────────────────────
async function turmasDaAvaliacao(req, res, next) {
  try {
    const { dbFindWhere } = require('../database/init');
    const vinculos = dbFindWhere('turma_avaliacoes', r => r.avaliacao_id === Number(req.params.id));
    const turmaRepo = require('../repositories/turma.repository');
    const turmas = vinculos.map(v => turmaRepo.findById(v.turma_id)).filter(Boolean);
    res.json({ turmas });
  } catch(e){ next(e); }
}

// ── GERAR FEEDBACK PEDAGÓGICO AVANÇADO ───────────────────────
async function gerarFeedbackPedagogico(aluno, av, nota, corretas, totalQ, respostasDetalhadas) {
  const taxa = Math.round(corretas / totalQ * 100);
  const titulo = av.titulo || 'Avaliação';

  const promptFeedback = [
    'Você é um especialista em pedagogia com expertise em BNCC, TRI e avaliação por competências.',
    'Gere um feedback educacional personalizado e motivador para um aluno que acabou de concluir uma avaliação.',
    '',
    `Aluno: ${aluno.nome}`,
    `Avaliação: ${titulo}`,
    `Nota: ${nota}/10`,
    `Taxa de acerto: ${taxa}%`,
    `Questões corretas: ${corretas} de ${totalQ}`,
    '',
    'Desempenho por tipo de questão:',
    ...respostasDetalhadas.map(r => {
      const q = r.questao;
      if (!q) return '';
      return `- ${q.tipo}: ${r.is_correct ? '✅ Correto' : '❌ Incorreto'} | ${q.enunciado?.slice(0,80)}...`;
    }).filter(Boolean),
    '',
    'Gere um feedback com exatamente estas seções (use markdown):',
    '## 🎯 Resultado',
    '(Resumo do desempenho em 1-2 frases)',
    '',
    '## ✅ Pontos Fortes',
    '(O que o aluno demonstrou dominar)',
    '',
    '## 📚 O que Revisar',
    '(Conteúdos/competências que precisam de atenção)',
    '',
    '## 💡 Sugestões de Estudo',
    '(3 sugestões práticas baseadas nos erros)',
    '',
    '## 🚀 Próximos Passos',
    '(Motivação e orientação para o aluno avançar)',
    '',
    'Tom: encorajador, didático e baseado em competências da BNCC.',
    'Máximo 300 palavras no total.',
  ].join("\n");

  const llm = require('../services/llm.service');
  return llm.chat({
    system: 'Você é um especialista em educação e avaliação pedagógica.',
    messages: [{ role: 'user', content: promptFeedback }],
    maxTokens: 600,
  });
}


// ── RESPONDER múltiplas questões de uma vez (batch) ─────────
async function responderBatch(req, res, next) {
  try {
    const { tentativa_id, respostas } = req.body;
    if (!tentativa_id || !Array.isArray(respostas)) {
      return res.status(400).json({ error: 'tentativa_id e respostas[] são obrigatórios.' });
    }
    const tentativa = avaliacaoRepo.findTentativaById(tentativa_id);
    if (!tentativa || tentativa.aluno_id !== req.user.id)
      return res.status(404).json({ error: 'Tentativa não encontrada.' });
    if (tentativa.status === 'concluida')
      return res.status(400).json({ error: 'Tentativa já concluída.' });

    // Salvar todas as respostas de uma vez
    const respostasAtuais = tentativa.respostas || [];
    for (const r of respostas) {
      const idx = respostasAtuais.findIndex(x => x.questao_id === r.questao_id);
      const respData = { questao_id: r.questao_id, resposta: r.resposta, respondida_em: new Date().toISOString() };
      if (idx >= 0) respostasAtuais[idx] = respData;
      else respostasAtuais.push(respData);
    }
    avaliacaoRepo.updateTentativa(tentativa_id, { respostas: respostasAtuais });
    res.json({ ok: true, total: respostas.length });
  } catch(e) { next(e); }
}

module.exports = { list, getById, create, update, remove, publicar, iniciar, responderQuestao, responderBatch, concluir, resultados, minhasTentativas, listarEntregas, corrigirManual, clonar, vincularTurmas, turmasDaAvaliacao };

// ── Listar entregas de upload para o professor corrigir ────────
async function listarEntregas(req, res, next) {
  try {
    const av = avaliacaoRepo.findById(req.params.id);
    if (!av) return res.status(404).json({ error: 'Avaliação não encontrada.' });

    const tentativas = avaliacaoRepo.findTentativasByAvalia(av.id);
    const questoesUpload = (av.questoes || [])
      .map(qc => questaoRepo.findById(qc.questao_id))
      .filter(q => q && q.tipo === 'upload_arquivo');

    if (questoesUpload.length === 0)
      return res.json({ entregas: [], questoes_upload: [] });

    const entregas = tentativas.map(t => {
      const aluno = userRepo.findById(t.aluno_id);
      if (!aluno) return null;
      const respostas_upload = (t.respostas || []).filter(r => {
        return questoesUpload.find(q => q.id === r.questao_id);
      }).map(r => {
        const q = questoesUpload.find(q => q.id === r.questao_id);
        let parsed = r.resposta;
        try { if (typeof r.resposta === 'string') parsed = JSON.parse(r.resposta); } catch {}
        return {
          questao_id: r.questao_id,
          enunciado: q?.enunciado,
          resposta: parsed,
          score_atual: r.score || null,
          feedback_prof: r.feedback_prof || null,
          corrigido_manualmente: r.corrigido_manualmente || false,
        };
      });
      const { senha_hash, ...safe } = aluno;
      return {
        tentativa_id: t.id,
        aluno: safe,
        status: t.status,
        nota: t.nota,
        aprovado: t.aprovado,
        iniciada_em: t.iniciada_em,
        concluida_em: t.concluida_em,
        respostas_upload,
        pendente_correcao: respostas_upload.some(r => !r.corrigido_manualmente),
      };
    }).filter(Boolean).filter(t => t.status === 'concluida');

    res.json({ entregas, questoes_upload: questoesUpload.map(q => ({ id: q.id, enunciado: q.enunciado })) });
  } catch(e){ next(e); }
}

// ── Professor corrige manualmente uma entrega ─────────────────
async function corrigirManual(req, res, next) {
  try {
    const { questao_id, nota, feedback } = req.body;
    if (nota === undefined || nota === null || nota < 0 || nota > 10)
      return res.status(400).json({ error: 'Nota deve estar entre 0 e 10.' });

    const tentativa = avaliacaoRepo.findTentativaById(req.params.tentativa_id);
    if (!tentativa) return res.status(404).json({ error: 'Tentativa não encontrada.' });

    const respostas = [...(tentativa.respostas || [])];
    const idx = respostas.findIndex(r => r.questao_id === Number(questao_id));
    if (idx === -1) return res.status(404).json({ error: 'Resposta não encontrada.' });

    // Atualizar score dessa questão
    respostas[idx] = {
      ...respostas[idx],
      score: nota / 10,
      is_correct: nota >= 8,
      feedback_prof: feedback || '',
      corrigido_manualmente: true,
    };

    // Recalcular nota geral da tentativa
    const av = avaliacaoRepo.findById(tentativa.avaliacao_id);
    const questoesConfig = av.questoes || [];
    let pontos = 0, pesoTotal = 0;
    for (const qc of questoesConfig) {
      const r = respostas.find(r => r.questao_id === qc.questao_id);
      if (r) { pontos += (r.score || 0) * (qc.peso || 1); pesoTotal += (qc.peso || 1); }
    }
    const novaNota = pesoTotal > 0 ? Math.round(pontos / pesoTotal * 10 * 100) / 100 : 0;
    const aprovado  = novaNota >= (av.nota_minima || 6);

    avaliacaoRepo.updateTentativa(tentativa.id, { respostas, nota: novaNota, aprovado });
    res.json({ message: 'Corrigido!', nota: novaNota, aprovado, score_questao: nota / 10 });
  } catch(e){ next(e); }
}
