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
      return res.status(503).json({ error: '⚠️ Configure OPENAI_API_KEY nas variáveis de ambiente.' });
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
      const allDiscIds = turmaIds.flatMap(tid => tdRepo.disciplinaIds(tid));
      const discsDaTurma = allDiscIds.filter(did => discIds.includes(did)).map(did => discRepo.findById(did)).filter(Boolean);
      minhasDiscs = discsDaTurma.length > 0 ? discsDaTurma : discIds.map(did => discRepo.findById(did)).filter(Boolean);
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

module.exports = { chat, limparSessao, indexarEmbeddings, disciplinas, statusSessao };
