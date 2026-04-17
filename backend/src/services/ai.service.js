/**
 * RSC Academy — AI Service (Multi-provider: OpenAI + Gemini)
 * Usa llm.service.js para suporte transparente a ambos os providers.
 * Configurar AI_PROVIDER=gemini ou AI_PROVIDER=openai no .env
 */
const { retrieveContext, formatContextForPrompt, markUsed } = require('./rag.service');
const llm = require('./llm.service');

// callGPT agora delega para llm.service (mantém compatibilidade)
async function callGPT({ system, messages, maxTokens = 2000, jsonMode = false }) {
  return llm.chat({ system, messages, maxTokens, jsonMode });
}

// parseJSON via llm.service
const parseJSON = llm.parseJSON;

// ── Configuração por tipo de questão ─────────────────────────
const TIPO_CONFIG = {
  multipla_escolha: { tri:'3PL', instrucao:'Crie 4 alternativas (A-D), apenas uma correta. Retorne gabarito como indice 0-3.' },
  verdadeiro_falso: { tri:'1PL', instrucao:'Afirmacao objetiva claramente V ou F. Retorne gabarito como true ou false.' },
  dissertativa:     { tri:'GRM', instrucao:'Questao aberta 2-4 linhas. Gabarito: palavras-chave separadas por |.' },
  preenchimento:    { tri:'2PL', instrucao:'Frase com lacuna ___. Gabarito: palavra ou expressao exata que preenche.' },
  associacao:       { tri:'2PL', instrucao:'4 itens esquerda, 4 direita. Gabarito: objeto {0:X,1:Y,2:Z,3:W} mapeando esquerda para direita.' },
  ordenacao:        { tri:'2PL', instrucao:'Lista de 4 itens. Gabarito: array com ordem correta dos indices (ex: [2,0,3,1]).' },
  upload_arquivo:   { tri:'GRM', instrucao:'Questao pratica. Gabarito: criterios de avaliacao separados por |.' },
};

// ── FUNCAO 1: Gerar questao completa ─────────────────────────
async function generateQuestion({ tipo, topico, nivel, instrucoes_extras = '', tags = [], ids = [], bncc = '', modelo_tri = '' }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.multipla_escolha;

  const contextos = retrieveContext(topico, tags, 2);
  const ragContext = formatContextForPrompt(contextos);
  contextos.forEach(function(ctx) { if (ctx && ctx.id != null) markUsed([ctx.id]); });

  const system = [
    'Voce e um especialista em avaliacao educacional, elaboracao de itens e Teoria de Resposta ao Item (TRI), com dominio da BNCC (Base Nacional Comum Curricular).',
    'Sua tarefa e gerar questoes educacionais de alta qualidade para uma plataforma gamificada de ensino (RSC ACADEMY).',
    '',
    'EXIGENCIAS PEDAGOGICAS:',
    '- Alinhar as questoes as competencias e habilidades da BNCC',
    '- Indicar a habilidade BNCC correspondente',
    '- Aplicar principios da TRI: discriminacao, dificuldade progressiva, distratores plausíveis',
    '- Linguagem clara, objetiva e adequada ao nivel do aluno',
    '- Contextualizacao real (problemas do cotidiano ou profissional)',
    '- Sempre gerar distratores realistas (erros comuns do aluno)',
    '- Variar os niveis cognitivos (lembrar, compreender, aplicar, analisar)',
    '',
    'Responda SEMPRE com JSON valido, sem texto fora do JSON.',
  ].join('\n');

  const prompt = [
    'Crie uma questao do tipo "' + tipo + '" sobre: "' + topico + '".',
    'Dificuldade: ' + (nivel || 'intermediario'),
    bncc ? 'Habilidade BNCC alvo (inclua no campo habilidade_bncc): ' + bncc : 'Sugira a habilidade BNCC mais adequada para este topico no campo habilidade_bncc.',
    modelo_tri ? 'Modelo TRI para calibrar: ' + modelo_tri + ' (inclua parametros a, b, c conforme o modelo)' : '',
    modelo_tri ? 'Modelo TRI preferido: ' + modelo_tri : '',
    instrucoes_extras ? 'Instrucoes extras: ' + instrucoes_extras : '',
    ragContext,
    'Instrucoes para o tipo ' + tipo + ': ' + cfg.instrucao,
    '',
    'Retorne APENAS este JSON:',
    '{',
    '  "enunciado": "texto completo",',
    '  "alternativas": null,',
    '  "gabarito": null,',
    '  "explicacao": "explicacao da resposta correta",',
    '  "dica": "dica para quem erra",',
    '  "tri": {',
    '    "modelo": "' + cfg.tri + '",',
    '    "a": 1.0, "b": 0.0, "c": 0.0,',
    '    "justificativa": "por que esses parametros"',
    '  },',
    '  "habilidade_bncc": "' + (bncc || 'EM13XXX000') + '",',
    '  "tags_sugeridas": ["tag1", "tag2"]',
    '}',
    '',
    'Para alternativas:',
    '- multipla_escolha: array de 4 strings',
    '- associacao: {"esquerda": [...4], "direita": [...4]}',
    '- ordenacao: array de 4 strings',
    '- outros: null',
  ].join('\n');

  const raw = await callGPT({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 1500, jsonMode: true });
  const questao = parseJSON(raw);
  if (!questao) throw new Error('GPT retornou JSON invalido: ' + raw.slice(0, 200));
  return { ...questao, tipo, rag_contextos_usados: contextos.map(c => c.id) };
}

// ── FUNCAO 2: Sugerir parametros TRI ─────────────────────────
async function suggestTRIParams({ tipo, enunciado, alternativas, gabarito, nivel_esperado }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.multipla_escolha;

  const system = [
    'Voce e um psicometrista especializado em TRI.',
    'Analisa questoes e calibra parametros com justificativa tecnica.',
    'Responda SEMPRE com JSON valido.',
  ].join('\n');

  const modelParams = {
    '1PL': '- b: dificuldade (-3 a +3)',
    '2PL': '- a: discriminacao (0.5 a 3.0)\n- b: dificuldade (-3 a +3)',
    '3PL': '- a: discriminacao (0.5 a 3.0)\n- b: dificuldade (-3 a +3)\n- c: chute (0 a 0.35)',
    'GRM': '- a: discriminacao (0.5 a 3.0)\n- b: limiar medio (-3 a +3)',
  }[cfg.tri] || '';

  const prompt = [
    'Analise esta questao e sugira parametros TRI para o modelo ' + cfg.tri + ':',
    'Tipo: ' + tipo,
    'Nivel esperado: ' + (nivel_esperado || 'intermediario'),
    'Enunciado: "' + enunciado + '"',
    alternativas ? 'Alternativas: ' + JSON.stringify(alternativas) : '',
    gabarito !== null ? 'Gabarito: ' + JSON.stringify(gabarito) : '',
    '',
    'Parametros do modelo ' + cfg.tri + ':',
    modelParams,
    'Regras: b negativo = facil, b positivo = dificil. a alto = boa discriminacao.',
    '',
    'Retorne APENAS este JSON:',
    '{',
    '  "modelo": "' + cfg.tri + '",',
    '  "a": 1.0, "b": 0.0, "c": 0.0,',
    '  "justificativa": "explicacao tecnica"',
    '}',
  ].join('\n');

  const raw = await callGPT({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 600, jsonMode: true });
  const result = parseJSON(raw);
  if (!result) throw new Error('Falha ao parsear sugestao TRI');
  return result;
}

// ── FUNCAO 3: Feedback pedagogico ────────────────────────────
async function generateFeedback({ questao, resposta_aluno, score, theta_antes, theta_depois, xp_ganho }) {
  const { tipo, enunciado, gabarito, explicacao } = questao;
  const acertou = score >= 0.8;
  const parcial = score > 0 && score < 0.8;
  const evolucao = (theta_depois || 0) - (theta_antes || 0);

  const system = [
    'Voce e um tutor educacional especializado e empatico.',
    'Da feedback construtivo, motivador e pedagogicamente rico.',
    'Maximo 150 palavras. Em portugues brasileiro.',
  ].join('\n');

  const resultado = acertou ? 'Correto' : parcial ? 'Parcialmente correto (' + Math.round(score * 100) + '%)' : 'Incorreto';

  const prompt = [
    'O aluno respondeu uma questao de ' + tipo + '.',
    'Questao: "' + enunciado + '"',
    'Resposta do aluno: ' + JSON.stringify(resposta_aluno),
    'Gabarito: ' + JSON.stringify(gabarito),
    explicacao ? 'Explicacao: ' + explicacao : '',
    'Resultado: ' + resultado,
    'XP ganho: ' + xp_ganho,
    'Theta: ' + (theta_antes || 0).toFixed(2) + ' para ' + (theta_depois || 0).toFixed(2) + ' (' + (evolucao >= 0 ? '+' : '') + evolucao.toFixed(2) + ')',
    '',
    acertou
      ? 'De um feedback positivo que aprofunde o conceito e celebre o acerto.'
      : parcial
      ? 'Explique o que foi correto e o que precisa melhorar.'
      : 'Corrija o erro, explique o conceito e motive o aluno.',
  ].join('\n');

  return await callGPT({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 300 });
}

// ── FUNCAO 4: Avaliar dissertativa/upload ─────────────────────
async function evaluateOpenAnswer({ enunciado, gabarito_criterios, resposta_aluno }) {
  const system = [
    'Voce e um avaliador especialista em educacao computacional.',
    'Avalia respostas dissertativas com criterios pedagogicos.',
    'Retorne SEMPRE JSON valido.',
  ].join('\n');

  const prompt = [
    'Avalie a resposta:',
    'Questao: "' + enunciado + '"',
    'Criterios: ' + gabarito_criterios,
    'Resposta: "' + resposta_aluno + '"',
    '',
    'Retorne APENAS este JSON:',
    '{',
    '  "score": 0.75,',
    '  "criterios": {"correcao": 0.8, "completude": 0.7, "clareza": 0.8, "exemplos": 0.5},',
    '  "pontos_positivos": "o que acertou",',
    '  "pontos_melhoria": "o que melhorar",',
    '  "score_justificativa": "por que essa nota"',
    '}',
  ].join('\n');

  const raw = await callGPT({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 600, jsonMode: true });
  const result = parseJSON(raw);
  if (!result || typeof result.score !== 'number') {
    return { score: 0.5, criterios: {}, pontos_positivos: '', pontos_melhoria: 'Avaliacao indisponivel' };
  }
  return result;
}

// ── FUNCAO 5: Chatbot do aluno ────────────────────────────────
async function chatWithStudent({ historico, pergunta, contexto_usuario }) {
  const system = [
    'Voce e um assistente educacional da plataforma RSC Academy.',
    'Ajuda alunos com duvidas sobre programacao e computacao.',
    'Use linguagem acessivel, exemplos praticos e emojis com moderacao.',
    'Contexto do aluno: ' + JSON.stringify(contexto_usuario || {}),
  ].join('\n');

  const messages = [
    ...(historico || []).slice(-6),
    { role: 'user', content: pergunta },
  ];

  return await callGPT({ system, messages, maxTokens: 800 });
}

async function chatWithContext({ system, messages, maxTokens = 1200 }) {
  return await callGPT({ system, messages, maxTokens });
}

module.exports = { generateQuestion, suggestTRIParams, generateFeedback, evaluateOpenAnswer, chatWithStudent, chatWithContext };
