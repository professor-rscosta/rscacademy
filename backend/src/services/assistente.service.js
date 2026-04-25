/**
 * RSC Academy — Assistente Virtual Avançado v2
 * RAG com embeddings OpenAI + memória de sessão + context expansion
 */

const { dbFindAll, dbUpdate, dbInsert } = require('../database/init');
const webSearch = require('./websearch.service');

// ── Memória de sessão (in-memory por usuário) ──────────────────
const sessoes = new Map(); // userId -> { historico, resumo, ultimaAtividade }
const MAX_HISTORICO = 20;
const TIMEOUT_SESSAO = 30 * 60 * 1000; // 30 min

function getSession(userId) {
  const agora = Date.now();
  let s = sessoes.get(userId);
  if (!s || agora - s.ultimaAtividade > TIMEOUT_SESSAO) {
    s = { historico: [], resumo: '', ultimaAtividade: agora };
    sessoes.set(userId, s);
  }
  s.ultimaAtividade = agora;
  return s;
}

function addToSession(userId, role, content) {
  const s = getSession(userId);
  s.historico.push({ role, content, ts: Date.now() });
  if (s.historico.length > MAX_HISTORICO) s.historico.shift();
}

function clearSession(userId) {
  sessoes.delete(userId);
}

// ── Embeddings via llm.service (OpenAI ou Gemini) ─────────────
const llm = require('./llm.service');
async function getEmbedding(text) {
  return llm.getEmbedding(text);
}

// ── Cosine Similarity (pure JS) ────────────────────────────────
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// ── MMR (Maximal Marginal Relevance) ──────────────────────────
function mmrRerank(docs, queryEmbed, lambda = 0.7, topK = 6) {
  if (docs.length <= topK) return docs;
  const selected = [];
  const remaining = [...docs];
  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0, bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const relevance = cosineSimilarity(remaining[i]._embed, queryEmbed);
      let maxSim = 0;
      for (const s of selected) {
        const sim = cosineSimilarity(remaining[i]._embed, s._embed);
        if (sim > maxSim) maxSim = sim;
      }
      const score = lambda * relevance - (1 - lambda) * maxSim;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  return selected;
}

// ── Indexar chunk com embedding ────────────────────────────────
async function indexarChunkComEmbedding(chunkId, texto) {
  try {
    const embed = await getEmbedding(texto);
    dbUpdate('rag_contextos', chunkId, { embedding: embed });
    return embed;
  } catch(e) {
    console.error('[Assistente] Embedding falhou para chunk', chunkId, e.message);
    return null;
  }
}

// ── Indexar todos os chunks sem embedding ──────────────────────
async function indexarPendentes(disciplinaId = null) {
  let contextos = await dbFindAll('rag_contextos');
  if (disciplinaId) contextos = contextos.filter(c => c.disciplina_id === Number(disciplinaId));
  const pendentes = contextos.filter(c => !c.embedding);
  let count = 0;
  // Processar sequencialmente com delay para respeitar limite free tier (15 RPM = 1 req/4s)
  for (const ctx of pendentes) {
    await indexarChunkComEmbedding(ctx.id, ctx.conteudo);
    count++;
    // 4 segundos entre embeddings garante <15 RPM (free tier Gemini)
    if (pendentes.length > 1) await new Promise(r => setTimeout(r, 4000));
  }
  return count;
}

// ── Busca vetorial principal ────────────────────────────────────
async function buscarContextos(pergunta, disciplinaId = null, topK = 8) {
  const queryEmbed = await getEmbedding(pergunta);

  let contextos = await dbFindAll('rag_contextos');
  if (disciplinaId) {
    const filtered = contextos.filter(c => c.disciplina_id === Number(disciplinaId));
    if (filtered.length > 0) contextos = filtered;
  }

  // Filtrar só os que têm embedding
  const comEmbed = contextos.filter(c => c.embedding && c.embedding.length > 0);

  if (comEmbed.length === 0) {
    // Fallback para TF-IDF se não há embeddings
    return buscarTFIDF(pergunta, disciplinaId, topK);
  }

  // Calcular similaridade
  const scored = comEmbed.map(c => ({
    ...c,
    _embed: c.embedding,
    _score: cosineSimilarity(c.embedding, queryEmbed),
  })).sort((a, b) => b._score - a._score);

  // MMR para diversidade
  const topCandidatos = scored.slice(0, Math.min(20, scored.length));
  const selecionados  = mmrRerank(topCandidatos, queryEmbed, 0.7, topK);

  // Context expansion usando ragSvc
  const ragSvc = require('./rag.service');
  const resultado = ragSvc.expandContext(selecionados, disciplinaId);

  return { chunks: resultado, queryEmbed, usouEmbeddings: true };
}

// ── Context Expansion: incluir chunks adjacentes ───────────────
function expandirContexto(selecionados, todosChunks) {
  const ids = new Set(selecionados.map(c => c.id));
  const expanded = [...selecionados];

  for (const chunk of selecionados) {
    // Encontrar chunks do mesmo documento com pagina_aprox próxima
    const vizinhos = todosChunks.filter(c =>
      !ids.has(c.id) &&
      c.doc_id === chunk.doc_id &&
      c.pagina_aprox &&
      chunk.pagina_aprox &&
      Math.abs(c.pagina_aprox - chunk.pagina_aprox) <= 1
    );
    for (const v of vizinhos) {
      if (!ids.has(v.id)) {
        ids.add(v.id);
        expanded.push({ ...v, _vizinho: true });
      }
    }
  }

  return expanded.sort((a, b) => (b._score||0) - (a._score||0));
}

// ── Fallback TF-IDF ────────────────────────────────────────────
function buscarTFIDF(pergunta, disciplinaId, topK) {
  const ragSvc = require('./rag.service');
  const chunks = ragSvc.retrieveContext(pergunta, [], topK, disciplinaId ? Number(disciplinaId) : null);
  return { chunks, queryEmbed: null, usouEmbeddings: false };
}

// ── Formatar contexto para prompt ──────────────────────────────
function formatarContexto(chunks) {
  if (!chunks || chunks.length === 0) return '';
  return chunks.map((c, i) => {
    const fonte = c.fonte ? ` [Fonte: ${c.fonte}]` : '';
    const vizinho = c._vizinho ? ' (contexto expandido)' : '';
    const score = c._score ? ` (relevância: ${(c._score * 100).toFixed(0)}%)` : '';
    return `--- Trecho ${i+1}${fonte}${vizinho}${score} ---\n${c.conteudo}`;
  }).join('\n\n');
}

// ── Gerar resumo do documento ──────────────────────────────────
async function gerarResumoDocumento(docId, textoExtraido) {
  try {
    const llm = require('./llm.service');
    return await llm.chat({
      system: 'Você faz resumos concisos de documentos acadêmicos. Máximo 5 frases.',
      messages: [{ role:'user', content:'Resuma este documento:\n\n' + textoExtraido.slice(0, 4000) }],
      maxTokens: 300,
    });
  } catch(e) { return ''; }
}


// ── Avaliar relevância dos chunks (RAG confidence score) ──────
function avaliarRelevanciaRAG(chunks, usouEmbeddings) {
  if (!chunks || chunks.length === 0) return { score: 0, confiante: false };

  // Com embeddings: usar cosine similarity scores
  if (usouEmbeddings) {
    const scores = chunks.filter(c => c._score).map(c => c._score);
    if (scores.length > 0) {
      const maxScore = Math.max(...scores);
      const avgScore = scores.reduce((a,b) => a+b, 0) / scores.length;
      return {
        score: maxScore,
        confiante: maxScore >= 0.60,  // 60% similaridade mínima
        detalhe: 'semântico: max=' + maxScore.toFixed(2) + ' avg=' + avgScore.toFixed(2),
      };
    }
  }

  // Com TF-IDF: usar scores de relevância
  const tfidfScores = chunks.filter(c => c._score).map(c => c._score);
  if (tfidfScores.length > 0) {
    const maxScore = Math.max(...tfidfScores);
    // TF-IDF requer score minimo mais alto para ser considerado confiante
    // Pois retorna resultados mesmo sem relação real
    return {
      score: maxScore,
      confiante: maxScore >= 0.05 && chunks.length >= 3,
      detalhe: 'tfidf: max=' + maxScore.toFixed(4) + ' chunks=' + chunks.length,
    };
  }

  // Sem scores: verificar se há conteúdo suficiente
  const totalPalavras = chunks.reduce((s, c) => s + (c.conteudo||'').split(/\s+/).length, 0);
  return {
    score: chunks.length > 0 ? 0.5 : 0,
    confiante: chunks.length >= 1 && totalPalavras >= 50,
    detalhe: 'conteudo: chunks=' + chunks.length + ' palavras=' + totalPalavras,
  };
}

// ── Chat principal com RAG avançado ────────────────────────────
async function chat({ userId, mensagem, disciplinaId, modoFileSear = false, modoForcar = null }) {
  const sessao = getSession(userId);
  addToSession(userId, 'user', mensagem);

  // ── PASSO 1: Busca no RAG ─────────────────────────────────────
  let resultado;
  try {
    resultado = await buscarContextos(mensagem, disciplinaId, 8);
  } catch(e) {
    console.error('[Assistente] Erro na busca vetorial:', e.message);
    resultado = buscarTFIDF(mensagem, disciplinaId, 6);
  }

  const { chunks, usouEmbeddings } = resultado;

  // ── PASSO 2: Avaliar relevância do RAG ────────────────────────
  const relevancia = avaliarRelevanciaRAG(chunks, usouEmbeddings);
  console.log('[Assistente] RAG score:', relevancia.detalhe, '| confiante:', relevancia.confiante);

  // Verificar se há docs na disciplina (para decidir fallback correto)
  let temDocsNaDisciplina = false;
  if (disciplinaId) {
    const docs = await dbFindAll('rag_documentos').filter(d => d.disciplina_id === Number(disciplinaId));
    temDocsNaDisciplina = docs.length > 0;
  } else {
    const ctxs = await dbFindAll('rag_contextos');
    temDocsNaDisciplina = ctxs.length > 0;
  }

  // ── PASSO 3: Decidir fonte e buscar ───────────────────────────
  // Se nao ha docs na disciplina, comeca como 'web' diretamente
  let modoFonte = (!temDocsNaDisciplina && !disciplinaId) ? 'rag' : (!temDocsNaDisciplina ? 'web' : 'rag');
  let webResultados = null;
  let webTexto = '';

  // Decidir se usa web baseado no modo forçado ou no auto-detect
  const semDocsNaDisciplina = !temDocsNaDisciplina;
  const usarWebAuto = (!relevancia.confiante || semDocsNaDisciplina) && webSearch.estaDisponivel();
  const usarWeb = modoForcar === 'web' ? webSearch.estaDisponivel()   // FORÇAR web
               : modoForcar === 'rag'  ? false                         // FORÇAR RAG, nunca web
               : usarWebAuto;                                          // Auto

  // Se modo forçado web, ignorar RAG completamente
  if (modoForcar === 'web') {
    console.log('[Assistente] Modo Web forcado pelo usuario.');
    modoFonte = 'web';
  }

  if (usarWeb || modoForcar === 'web') {
    try {
      console.log('[Assistente] RAG insuficiente, buscando na web...');
      const wsResult = await webSearch.search(mensagem);
      if (wsResult && wsResult.resultados?.length > 0) {
        webResultados = wsResult.resultados;
        webTexto = webSearch.formatarParaPrompt(wsResult.resultados);
        modoFonte = chunks.length > 0 ? 'hibrido' : 'web';
        console.log('[Assistente] Web search: ' + wsResult.resultados.length + ' resultados via ' + wsResult.provider + (wsResult.fromCache ? ' (cache)' : ''));
      }
    } catch(e) {
      console.error('[Assistente] Web search falhou:', e.message);
    }
  }

  // ── PASSO 4: Montar contexto e prompt ─────────────────────────
  const contextoRAG = formatarContexto(chunks);
  const fontes = [...new Set(chunks.map(c => c.fonte).filter(Boolean))];
  const fontesWeb = webResultados ? webResultados.map(r => r.fonte).filter(Boolean) : [];

  let resumoGlobal = '';
  if (disciplinaId) {
    const docs = await dbFindAll('rag_documentos').filter(d => d.disciplina_id === Number(disciplinaId));
    if (docs.length > 0) {
      resumoGlobal = docs.map(d => '• ' + d.titulo + ': ' + (d.descricao || 'Documento indexado')).join('\n');
    }
  }

  const historicoFormatado = sessao.historico.slice(-12, -1)
    .map(m => (m.role === 'user' ? 'Aluno' : 'Assistente') + ': ' + m.content)
    .join('\n');

  // Indicador de fonte para o prompt
  const indicadorFonte = {
    rag:    'Inicie sua resposta OBRIGATORIAMENTE com: "Baseado nos documentos da plataforma:" e use apenas os documentos fornecidos.',
    web:    'Inicie sua resposta OBRIGATORIAMENTE com: "Baseado em busca na web:" e cite as fontes consultadas. NAO diga que nao encontrou nos documentos.',
    hibrido:'Inicie sua resposta com: "Baseado nos documentos e busca na web:" e combine ambas as fontes.',
  }[modoFonte];

  const systemParts = [
    '# Assistente Virtual RSC Academy',
    'Você é um assistente especializado em educação. Responda de forma clara, objetiva e didática.',
    'Use markdown para formatação quando necessário.',
    '',
    historicoFormatado ? '## Histórico recente:\n' + historicoFormatado : '',
    '',
    resumoGlobal ? '## Documentos disponíveis:\n' + resumoGlobal : '',
    '',
    modoFonte !== 'web' && contextoRAG ? '## 📚 Base de conhecimento (documentos):\n' + contextoRAG : '',
    '',
    modoFonte !== 'rag' && webTexto ? '## 🌐 Resultados da busca na web:\n' + webTexto : '',
    '',
    '## Instruções obrigatórias:',
    indicadorFonte,
    '- Seja específico e cite trechos quando usar documentos',
    '- Seja didático e use exemplos práticos',
    !temDocsNaDisciplina ? '- Não há documentos nesta disciplina, use seu conhecimento geral' : '',
    modoFonte === 'rag' ? '- Se a informação não estiver nos documentos, diga claramente e ofereça buscar na web' : '',
    modoFonte === 'web' ? '- Cite as fontes web usadas na resposta' : '',
  ].filter(Boolean).join('\n');

  // ── PASSO 5: Chamar LLM ───────────────────────────────────────
  const resposta = await llm.chat({
    system: systemParts,
    messages: [{ role: 'user', content: mensagem }],
    maxTokens: 1500,
  });

  addToSession(userId, 'assistant', resposta);
  chunks.forEach(ch => { if (ch.id) dbUpdate('rag_contextos', ch.id, { vezes_usado: (ch.vezes_usado||0)+1 }); });

  return {
    resposta,
    fontes,
    fontes_web: fontesWeb,
    chunks_usados: chunks.length,
    usou_embeddings: usouEmbeddings,
    modo_fonte: modoFonte,
    rag_score: relevancia.score,
    historico_tamanho: sessao.historico.length,
  };
}

module.exports = {
  chat,
  getSession,
  clearSession,
  indexarPendentes,
  indexarChunkComEmbedding,
  gerarResumoDocumento,
  buscarContextos,
};
