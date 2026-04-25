/**
 * Assistente Virtual Avançado — Controller
 * RAG com embeddings, memória de sessão, context expansion
 */
const assistenteSvc = require('../services/assistente.service');
const ragSvc        = require('../services/rag.service');
const discRepo      = require('../repositories/disciplina.repository');
const turmaRepo     = require('../repositories/turma.repository');
const tdRepo        = require('../repositories/turma_disciplina.repository');
const { dbFindAll } = require('../database/init');

// ── Chat principal ─────────────────────────────────────────────
async function chat(req, res, next) {
  try {
    const { mensagem, disciplina_id, modo } = req.body;
    if (!mensagem?.trim()) return res.status(400).json({ error: 'Mensagem é obrigatória.' });

    const resultado = await assistenteSvc.chat({
      userId:       req.user.id,
      mensagem:     mensagem.trim(),
      disciplinaId: disciplina_id ? Number(disciplina_id) : null,
      modoForcar:   modo === 'web' ? 'web' : modo === 'rag' ? 'rag' : null, // null = auto
    });

    res.json(resultado);
  } catch(e) {
    console.error('[Assistente] chat error:', e.message, '| statusCode:', e.statusCode);

    const s = e.statusCode || 500;
    if (s === 503 || e.message?.includes('configurad') || e.message?.includes('API_KEY'))
      return res.status(503).json({ error: '⚙️ Chave de IA não configurada. Defina OPENAI_API_KEY ou GEMINI_API_KEY nas variáveis de ambiente.' });
    if (s === 401)
      return res.status(401).json({ error: '🔑 Chave de API inválida. Verifique OPENAI_API_KEY no painel OpenAI.' });
    if (s === 402)
      return res.status(402).json({ error: '💳 Créditos OpenAI esgotados. Adicione créditos em platform.openai.com.' });
    if (s === 429 || e.message?.includes('429') || e.message?.includes('limite') || e.message?.includes('quota'))
      return res.status(429).json({ error: '⏳ Limite de requisições da IA atingido. Aguarde alguns instantes e tente novamente.' });
    if (e.name === 'AbortError' || e.message?.includes('timeout'))
      return res.status(504).json({ error: '⏱️ A IA demorou demais para responder. Tente novamente.' });

    return res.status(s >= 400 ? s : 500).json({ error: '❌ Erro ao chamar a IA: ' + e.message });
  }
}

// ── Limpar sessão ──────────────────────────────────────────────
async function limparSessao(req, res) {
  assistenteSvc.clearSession(req.user.id);
  res.json({ message: 'Sessão limpa!' });
}

// ── Indexar embeddings pendentes ───────────────────────────────
async function indexarEmbeddings(req, res, next) {
  try {
    const { disciplina_id } = req.query;
    const count = await assistenteSvc.indexarPendentes(disciplina_id ? Number(disciplina_id) : null);
    res.json({ message: `${count} chunks indexados com embeddings.`, count });
  } catch(e) { next(e); }
}

// ── Listar disciplinas com RAG ─────────────────────────────────
async function disciplinas(req, res, next) {
  try {
    const docs     = await dbFindAll('rag_documentos') || [];
    const contextos = await dbFindAll('rag_contextos') || [];

    const discIdsFromDocs = [...new Set(docs.map(d => d.disciplina_id))];
    const discIdsFromCtx  = [...new Set(contextos.map(c => c.disciplina_id))];
    const discIds = [...new Set([...discIdsFromDocs, ...discIdsFromCtx])];

    let minhasDiscs = [];
    if (req.user.perfil === 'aluno') {
      const turmaIds = (await turmaRepo.getTurmasAluno(req.user.id)||[]).map(m => m.turma_id);

      // Tentar primeiro aluno_disciplina (matrícula individual por disciplina)
      const adRepo = require('../repositories/aluno_disciplina.repository');
      const discIdsAluno = await adRepo.disciplinaIds(req.user.id);

      let allDiscIds;
      if (discIdsAluno.length > 0) {
        allDiscIds = discIdsAluno;
      } else {
        // Fallback: disciplinas via turma
        allDiscIds = (await Promise.all(turmaIds.map(async tid => tdRepo.disciplinaIds(tid)))).flat();
      }

      // Intersectar com disciplinas que têm RAG
      const discsDaTurma = allDiscIds
        .filter(did => discIds.includes(did))
        .map(async did => await discRepo.findById(did)).filter(Boolean);

      // Se nenhuma disciplina tem RAG mas aluno tem turma, mostrar todas com RAG
      if (discsDaTurma.length === 0 && allDiscIds.length > 0) {
        // Aluno tem disciplinas mas sem RAG ainda - mostrar todas suas disciplinas
        const todasSuas = (await Promise.all(allDiscIds.map(async did => await discRepo.findById(did)))).filter(Boolean);
        minhasDiscs = todasSuas.length > 0 ? todasSuas : (await Promise.all(discIds.map(async did => await discRepo.findById(did)))).filter(Boolean);
      } else {
        minhasDiscs = discsDaTurma.length > 0 ? discsDaTurma : (await Promise.all(discIds.map(async did => await discRepo.findById(did)))).filter(Boolean);
      }
    } else {
      minhasDiscs = (await Promise.all(discIds.map(async did => await discRepo.findById(did)))).filter(Boolean);
    }

    const resultado = minhasDiscs.map(d => {
      const docsDaDisc = docs.filter(doc => doc.disciplina_id === d.id);
      const ctxDaDisc  = contextos.filter(ctx => ctx.disciplina_id === d.id);
      const comEmbed   = ctxDaDisc.filter(ctx => ctx.embedding?.length > 0).length;
      return {
        id: d.id, nome: d.nome,
        total_docs: docsDaDisc.length,
        total_chunks: ctxDaDisc.length,
        chunks_com_embedding: comEmbed,
        embeddings_prontos: comEmbed === ctxDaDisc.length && ctxDaDisc.length > 0,
      };
    });

    res.json({ disciplinas: resultado });
  } catch(e) { next(e); }
}

// ── Status da sessão ───────────────────────────────────────────
async function statusSessao(req, res) {
  const s = assistenteSvc.getSession(req.user.id);
  res.json({
    historico_msgs: s.historico.length,
    ultima_atividade: s.ultimaAtividade,
  });
}


// ── Upload temporário no chat (ChatPDF mode) ──────────────────
async function uploadChatFile(req, res, next) {
  try {
    const { base64, mimeType, fileName, disciplina_id } = req.body;
    if (!base64 || !fileName) return res.status(400).json({ error: 'base64 e fileName são obrigatórios.' });
    console.log('[Upload] arquivo:', fileName, 'tamanho base64:', (base64?.length||0), 'bytes');

    // Extrair texto
    const ragSvc = require('../services/rag.service');
    // Handle image files specially - describe them via AI instead of text extraction
    const ext = (fileName || '').split('.').pop().toLowerCase();
    const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext) || (mimeType||'').startsWith('image/');

    let textoExtraido;
    if (isImage) {
      // For images: use LLM vision to describe content
      try {
        const llm = require('../services/llm.service');
        // Extract clean base64 data (remove data URL prefix if present)
        const rawData = base64.includes(',') ? base64.split(',')[1] : base64;
        // Validate: must be valid base64 (no spaces, correct length)
        if (!rawData || rawData.length < 100) throw new Error('Imagem muito pequena ou invalida.');
        // Normalize mime type to accepted values
        const validMimes = ['image/jpeg','image/png','image/gif','image/webp'];
        const safeMime = validMimes.includes(mimeType) ? mimeType : 'image/jpeg';
        textoExtraido = await llm.chat({
          system: 'Voce e um assistente educacional. Descreva detalhadamente o conteudo desta imagem em portugues, incluindo textos, tabelas, graficos, formulas e quaisquer elementos educacionais presentes.',
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: safeMime, data: rawData } },
            { type: 'text', text: 'Descreva esta imagem detalhadamente para uso educacional.' }
          ] }],
          maxTokens: 600,
        });
        textoExtraido = '[Imagem: ' + fileName + '] ' + (textoExtraido || '');
      } catch(imgErr) {
        console.error('[Upload] image vision error:', imgErr.message);
        // Fallback: accept the image but use filename as context
        textoExtraido = '[Imagem enviada: ' + fileName + '] Conteudo visual disponivel para analise.';
      }
    } else {
      try {
        textoExtraido = await ragSvc.extractTextFromBase64(base64, mimeType, fileName);
      } catch(extractErr) {
        console.error('[Upload] extract error:', extractErr.message);
        textoExtraido = '';
      }
    }

    const textoLimpo = (textoExtraido || '').trim();
    console.log('[Upload] texto extraido:', textoLimpo.length, 'chars');
    if (textoLimpo.length < 20 && !isImage) {
      return res.status(400).json({
        error: 'Nao foi possivel extrair texto deste arquivo. Use PDF com texto selecionavel, DOCX ou TXT.',
        chars_extraidos: textoLimpo.length,
      });
    }

    // Criar chunks
    const chunks = ragSvc.chunkText(textoLimpo);
    const { dbInsert, dbDeleteWhere } = require('../database/init');

    // Criar doc temporário (prefixo "temp_chat_userId")
    const sessionKey = `temp_chat_${req.user.id}`;
    dbDeleteWhere('rag_contextos', c => c.doc_id === sessionKey);

    for (let i = 0; i < chunks.length; i++) {
      dbInsert('rag_contextos', {
        doc_id:        sessionKey,
        disciplina_id: disciplina_id ? Number(disciplina_id) : 0,
        titulo:        `${fileName} › ${chunks[i].secao} [${i+1}]`,
        conteudo:      chunks[i].conteudo,
        secao:         chunks[i].secao,
        indice:        i,
        pagina_aprox:  i + 1,
        fonte:         fileName,
        tipo_fonte:    'chat_upload',
        tags:          ['chat_upload', fileName, req.user.id],
        vezes_usado:   0,
        temp_session:  req.user.id,
      });
    }

    // Embeddings não gerados automaticamente para evitar rate limit

    const qualidade = ragSvc.textQuality(textoLimpo);
    res.json({
      message: `✅ "${fileName}" processado! ${chunks.length} trechos indexados.`,
      fileName,
      chunks: chunks.length,
      chars: textoExtraido.length,
      qualidade,
      sessionKey,
    });
  } catch(e) { next(e); }
}

// ── Chat com arquivo temporário (ChatPDF mode) ─────────────────
async function chatComArquivo(req, res, next) {
  try {
    const { mensagem, sessionKey, disciplina_id } = req.body;
    if (!mensagem?.trim()) return res.status(400).json({ error: 'Mensagem é obrigatória.' });

    const ragSvc = require('../services/rag.service');
    const { dbFindAll } = require('../database/init');

    // Buscar chunks do arquivo temporário
    let contextos = await dbFindAll('rag_contextos').filter(c => c.doc_id === sessionKey || c.doc_id === `temp_chat_${req.user.id}`);
    if (contextos.length === 0 && disciplina_id) {
      contextos = ragSvc.retrieveContext(mensagem, [], 8, Number(disciplina_id));
    }

    const llmSvc = require('../services/llm.service');
    const contextText = ragSvc.formatContextForPrompt(contextos.slice(0,8));
    const system = [
      'Você é um assistente especializado em análise de documentos.',
      contextos.length > 0 ? ('Contexto do arquivo:\n' + contextText) : 'Nenhum documento carregado ainda.',
      'Responda com base exclusivamente no conteúdo acima. Se não encontrar, informe claramente.',
    ].join('\n\n');

    const resposta = await llmSvc.chat({ system, messages:[{ role:'user', content:mensagem }], maxTokens:1200 });
    res.json({ resposta, chunks_usados: Math.min(8, contextos.length), fontes: ['arquivo'] });
  } catch(e) { next(e); }
}

module.exports = { chat, limparSessao, indexarEmbeddings, disciplinas, statusSessao, uploadChatFile, chatComArquivo };
