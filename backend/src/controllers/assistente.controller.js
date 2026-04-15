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
    const { mensagem, disciplina_id } = req.body;
    if (!mensagem?.trim()) return res.status(400).json({ error: 'Mensagem é obrigatória.' });

    const resultado = await assistenteSvc.chat({
      userId:       req.user.id,
      mensagem:     mensagem.trim(),
      disciplinaId: disciplina_id ? Number(disciplina_id) : null,
    });

    res.json(resultado);
  } catch(e) {
    if (e.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ error: '⚠️ Configure OPENAI_API_KEY ou GEMINI_API_KEY nas variáveis de ambiente.' });
    }
    next(e);
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
    const docs     = dbFindAll('rag_documentos') || [];
    const contextos = dbFindAll('rag_contextos') || [];

    const discIdsFromDocs = [...new Set(docs.map(d => d.disciplina_id))];
    const discIdsFromCtx  = [...new Set(contextos.map(c => c.disciplina_id))];
    const discIds = [...new Set([...discIdsFromDocs, ...discIdsFromCtx])];

    let minhasDiscs = [];
    if (req.user.perfil === 'aluno') {
      const turmaIds = (turmaRepo.getTurmasAluno(req.user.id)||[]).map(m => m.turma_id);

      // Tentar primeiro aluno_disciplina (matrícula individual por disciplina)
      const adRepo = require('../repositories/aluno_disciplina.repository');
      const discIdsAluno = adRepo.disciplinaIds(req.user.id);

      let allDiscIds;
      if (discIdsAluno.length > 0) {
        allDiscIds = discIdsAluno;
      } else {
        // Fallback: disciplinas via turma
        allDiscIds = turmaIds.flatMap(tid => tdRepo.disciplinaIds(tid));
      }

      // Intersectar com disciplinas que têm RAG
      const discsDaTurma = allDiscIds
        .filter(did => discIds.includes(did))
        .map(did => discRepo.findById(did)).filter(Boolean);

      // Se nenhuma disciplina tem RAG mas aluno tem turma, mostrar todas com RAG
      if (discsDaTurma.length === 0 && allDiscIds.length > 0) {
        // Aluno tem disciplinas mas sem RAG ainda - mostrar todas suas disciplinas
        const todasSuas = allDiscIds.map(did => discRepo.findById(did)).filter(Boolean);
        minhasDiscs = todasSuas.length > 0 ? todasSuas : discIds.map(did => discRepo.findById(did)).filter(Boolean);
      } else {
        minhasDiscs = discsDaTurma.length > 0 ? discsDaTurma : discIds.map(did => discRepo.findById(did)).filter(Boolean);
      }
    } else {
      minhasDiscs = discIds.map(did => discRepo.findById(did)).filter(Boolean);
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
    let textoExtraido;
    try {
      textoExtraido = await ragSvc.extractTextFromBase64(base64, mimeType, fileName);
    } catch(extractErr) {
      console.error('[Upload] extract error:', extractErr.message);
      return res.status(422).json({ error: 'Falha ao extrair texto: ' + extractErr.message });
    }

    const textoLimpo = (textoExtraido || '').trim();
    console.log('[Upload] texto extraído:', textoLimpo.length, 'chars');
    if (textoLimpo.length < 50) {
      return res.status(400).json({
        error: 'Não foi possível extrair texto deste arquivo. Use PDF com texto selecionável, DOCX ou TXT.',
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

    // Gerar embedding em background
    assistenteSvc.indexarPendentes(disciplina_id ? Number(disciplina_id) : null).catch(() => {});

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
    let contextos = dbFindAll('rag_contextos').filter(c => c.doc_id === sessionKey || c.doc_id === `temp_chat_${req.user.id}`);
    if (contextos.length === 0 && disciplina_id) {
      contextos = ragSvc.retrieveContext(mensagem, [], 8, Number(disciplina_id));
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY não configurada.' });

    const contextText = ragSvc.formatContextForPrompt(contextos.slice(0,8));
    const system = [
      'Você é um assistente especializado em análise de documentos.',
      contextos.length > 0 ? ('Contexto do arquivo:\n' + contextText) : 'Nenhum documento carregado ainda.',
      'Responda com base exclusivamente no conteúdo acima. Se não encontrar, informe claramente.',
    ].join('\n\n');

    const res2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini', max_tokens: 1200, temperature: 0.3,
        messages: [{ role: 'system', content: system }, { role: 'user', content: mensagem }],
      }),
    });
    const data = await res2.json();
    const resposta = data.choices?.[0]?.message?.content || 'Sem resposta.';

    res.json({ resposta, chunks_usados: Math.min(8, contextos.length), fontes: [sessionKey?.replace(`temp_chat_${req.user.id}`, '') || 'arquivo'] });
  } catch(e) { next(e); }
}

module.exports = { chat, limparSessao, indexarEmbeddings, disciplinas, statusSessao, uploadChatFile, chatComArquivo };
