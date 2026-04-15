/**
 * Chatbot Controller — com RAG por disciplina
 * Aluno escolhe a disciplina e as respostas são baseadas nos documentos do professor
 */
const aiService   = require('../services/ai.service');
const ragSvc      = require('../services/rag.service');
const userRepo    = require('../repositories/user.repository');
const respostaRepo = require('../repositories/resposta.repository');
const turmaRepo   = require('../repositories/turma.repository');
const discRepo    = require('../repositories/disciplina.repository');
const tdRepo      = require('../repositories/turma_disciplina.repository');

async function chat(req, res, next) {
  try {
    const { mensagem, historico = [], disciplina_id } = req.body;
    if (!mensagem?.trim()) return res.status(400).json({ error: 'Mensagem é obrigatória.' });

    // Contexto do aluno
    const user     = userRepo.findById(req.user.id);
    const respostas = respostaRepo.findByAluno(req.user.id);
    const taxa      = respostas.length > 0
      ? Math.round(respostas.filter(r => r.is_correct).length / respostas.length * 100)
      : 0;

    // Recuperar nome da disciplina
    let discNome = '';
    if (disciplina_id) {
      const disc = discRepo.findById(disciplina_id);
      discNome = disc?.nome || '';
    }

    // Buscar contexto RAG dos documentos da disciplina
    // Busca TF-IDF com Top-8
    const contextos = ragSvc.retrieveContext(mensagem, [], 8, disciplina_id ? Number(disciplina_id) : null);
    // Context expansion: chunks vizinhos
    const contextoExpandido = ragSvc.expandContext(contextos, disciplina_id ? Number(disciplina_id) : null);
    const ragContext = ragSvc.formatContextForPrompt(contextoExpandido);
    const fontes     = [...new Set(contextoExpandido.map(c => c.fonte).filter(Boolean))];

    // Marcar uso dos contextos
    if (contextoExpandido.length > 0) ragSvc.markUsed(contextoExpandido.map(c => c.id));

    const contexto_usuario = {
      nome:           user?.nome,
      perfil:         user?.perfil,
      total_respostas: respostas.length,
      taxa_acerto:    taxa + '%',
      disciplina:     discNome,
    };

    // Construir system prompt com RAG
    let system = [
      'Você é o Assistente de IA da plataforma educacional RSC Academy.',
      'Ajude o aluno com dúvidas de forma clara, didática e com exemplos práticos.',
      'Use emojis com moderação para tornar a resposta mais amigável.',
      'Se não souber a resposta, diga honestamente.',
      '',
      `Contexto do aluno: ${JSON.stringify(contexto_usuario)}`,
    ];

    if (discNome) {
      system.push(`Disciplina atual: ${discNome}`);
    }

    if (ragContext) {
      system.push('');
      system.push('=== BASE DE CONHECIMENTO OFICIAL ===');
      system.push('As informações abaixo são de documentos oficiais cadastrados pelo professor.');
      system.push('Priorize sempre estas informações ao responder. Cite a fonte quando relevante.');
      system.push('');
      system.push(ragContext);
      system.push('=== FIM DA BASE DE CONHECIMENTO ===');
    }

    const messages = [
      ...(historico || []).slice(-8),
      { role: 'user', content: mensagem },
    ];

    const resposta = await aiService.chatWithContext({
      system: system.join('\n'),
      messages,
    });

    res.json({ resposta, fontes, total_contextos: contextos.length });
  } catch(e) {
    if (e.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ error: 'Configure OPENAI_API_KEY no .env do backend.' });
    }
    next(e);
  }
}

// ── Listar disciplinas disponíveis para o chatbot ─────────────
async function disciplinas(req, res, next) {
  try {
    const { dbFindAll } = require('../database/init');
    // Disciplinas que têm documentos RAG cadastrados
    const docs = (dbFindAll('rag_documentos')||[]);
    const contextos = (dbFindAll('rag_contextos')||[]);
    // Incluir disciplinas com documentos OU com contextos diretos
    const discIdsFromDocs = [...new Set(docs.map(d => d.disciplina_id))];
    const discIdsFromCtx  = [...new Set(contextos.map(c => c.disciplina_id))];
    const discIds = [...new Set([...discIdsFromDocs, ...discIdsFromCtx])];

    let minhasDiscs = [];
    if (req.user.perfil === 'aluno') {
      const turmaIds = (turmaRepo.getTurmasAluno(req.user.id)||[]).map(m => m.turma_id);
      const allDiscIds = turmaIds.flatMap(tid => tdRepo.disciplinaIds(tid));
      // Disciplinas da turma que têm RAG
      const discsDaTurma = allDiscIds
        .filter(did => discIds.includes(did))
        .map(did => discRepo.findById(did))
        .filter(Boolean);
      
      // Se o aluno não tem turma ou a turma não tem RAG, mostra TODAS as disciplinas com RAG
      if (discsDaTurma.length > 0) {
        minhasDiscs = discsDaTurma;
      } else {
        minhasDiscs = discIds.map(did => discRepo.findById(did)).filter(Boolean);
      }
    } else {
      minhasDiscs = discIds.map(did => discRepo.findById(did)).filter(Boolean);
    }

    const comDocs = minhasDiscs.map(d => ({
      id: d.id,
      nome: d.nome,
      total_docs: docs.filter(doc => doc.disciplina_id === d.id).length,
        total_contextos: contextos.filter(ctx => ctx.disciplina_id === d.id).length,
    }));

    res.json({ disciplinas: comDocs });
  } catch(e){ next(e); }
}

module.exports = { chat, disciplinas };
