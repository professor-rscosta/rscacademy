/**
 * RAG Document Controller — v3
 */
const ragRepo  = require('../repositories/rag_document.repository');
const discRepo = require('../repositories/disciplina.repository');
const ragSvc   = require('../services/rag.service');
const assistenteSvc = require('../services/assistente.service');
const { dbFindAll, dbDeleteWhere } = require('../database/init');

async function list(req, res, next) {
  try {
    const { disciplina_id } = req.query;
    let docs = disciplina_id ? ragRepo.findByDisciplina(disciplina_id)
      : req.user.perfil === 'professor' ? ragRepo.findByProf(req.user.id)
      : ragRepo.findAll();

    docs = docs.map(d => ({
      ...d,
      total_chunks: ragRepo.findContextosByDoc(d.id).length,
      base64: undefined,
      texto_extraido: undefined,
    }));
    res.json({ documentos: docs });
  } catch(e){ next(e); }
}

async function upload(req, res, next) {
  try {
    const { titulo, descricao, disciplina_id, tipo_documento, categoria, tags, base64, fileName, mimeType, tamanho } = req.body;

    if (!titulo?.trim()) return res.status(400).json({ error: 'Título é obrigatório.' });
    if (!base64)         return res.status(400).json({ error: 'Arquivo é obrigatório.' });
    if (!disciplina_id)  return res.status(400).json({ error: 'Selecione uma disciplina.' });

    const disc = await discRepo.findById(disciplina_id);
    if (!disc) return res.status(404).json({ error: 'Disciplina não encontrada.' });

    console.log(`[RAG] Upload: ${fileName} (${mimeType}, ${Math.round((tamanho||0)/1024)}KB)`);

    const texto = await ragSvc.extractTextFromBase64(base64, mimeType, fileName);
    const textoLimpo = (texto||'').replace(/[ \t]{2,}/g, ' ').trim();
    // Calcular qualidade inline (% de chars alfabéticos)
    const qualidade = (() => {
      if (!textoLimpo) return 0;
      const alpha = (textoLimpo.match(/[a-zA-ZÀ-ÿ]/g)||[]).length;
      const total = textoLimpo.replace(/\s/g,'').length || 1;
      return Math.round(100 * alpha / total);
    })();
    const palavras   = textoLimpo.split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ]{3,}/.test(w));

    console.log(`[RAG] Extração: ${textoLimpo.length} chars, ${palavras.length} palavras, qualidade ${qualidade}%`);

    if (textoLimpo.length < 30 || palavras.length < 5) {
      return res.status(400).json({
        error: 'Não foi possível extrair texto legível do documento.',
        dicas: [
          'PDFs escaneados (apenas imagem) não têm texto — use PDF com texto selecionável.',
          'PDFs protegidos por senha não podem ser lidos.',
          'Use .txt, .docx ou .md para garantir extração perfeita.',
          'Em MS Word: Arquivo → Salvar Como → Formato .txt ou .docx',
        ],
        qualidade,
      });
    }

    let aviso = null;
    if (qualidade < 40) {
      aviso = `Qualidade da extração: ${qualidade}%. PDFs com fontes especiais podem ter caracteres corrompidos. Considere usar .txt ou .docx.`;
    }

    const doc = ragRepo.create({
      titulo:           titulo.trim(),
      descricao:        descricao || '',
      disciplina_id:    Number(disciplina_id),
      professor_id:     req.user.id,
      tipo_documento:   tipo_documento || 'outro',
      categoria:        categoria || '',
      tags:             Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : []),
      fileName:         fileName || 'documento',
      mimeType:         mimeType || '',
      tamanho:          tamanho || 0,
      texto_extraido:   textoLimpo,
      total_caracteres: textoLimpo.length,
      total_palavras:   palavras.length,
      qualidade_extracao: qualidade,
      status:           'indexado',
    });

    const totalChunks = await ragSvc.indexDocument(doc, disciplina_id);

    // Embeddings gerados manualmente pelo professor via botão 'Ativar Busca Semântica'

    res.status(201).json({
      documento:          { ...doc, base64: undefined, texto_extraido: undefined },
      total_chunks:       totalChunks,
      total_caracteres:   textoLimpo.length,
      total_palavras:     palavras.length,
      qualidade_extracao: qualidade,
      message:            `Documento indexado! ${totalChunks} trechos criados.`,
      aviso,
    });
  } catch(e){
    console.error('[RAG] upload error:', e.message);
    next(e);
  }
}

async function reindexar(req, res, next) {
  try {
    const doc = ragRepo.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (!doc.texto_extraido || doc.texto_extraido.length < 30)
      return res.status(400).json({ error: 'Sem texto extraído. Remova e faça upload novamente.' });

    ragRepo.deleteContextosByDoc(doc.id);
    const totalChunks = await ragSvc.indexDocument(doc, doc.disciplina_id);
    ragRepo.update(doc.id, { status: 'indexado', updated_at: new Date().toISOString() });

    res.json({ message: `Reindexado! ${totalChunks} trechos.`, total_chunks: totalChunks });
  } catch(e){ next(e); }
}

async function remove(req, res, next) {
  try {
    const doc = ragRepo.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (req.user.perfil === 'professor' && doc.professor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado.' });

    ragRepo.deleteContextosByDoc(doc.id);
    ragRepo.remove(doc.id);
    res.json({ message: 'Documento removido.' });
  } catch(e){ next(e); }
}

async function searchContextos(req, res, next) {
  try {
    const { query, disciplina_id, topK = 5 } = req.query;
    if (!query) return res.status(400).json({ error: 'query é obrigatória.' });
    const contextos = ragSvc.retrieveContext(query, [], Number(topK), disciplina_id ? Number(disciplina_id) : null);
    res.json({ contextos, total: contextos.length });
  } catch(e){ next(e); }
}

async function stats(req, res, next) {
  try {
    const docs = req.user.perfil === 'professor' ? ragRepo.findByProf(req.user.id) : ragRepo.findAll();
    const totalChunks = docs.reduce((s,d) => s + ragRepo.findContextosByDoc(d.id).length, 0);
    const byTipo = {};
    docs.forEach(d => { const t = d.tipo_documento||'outro'; byTipo[t] = (byTipo[t]||0) + 1; });
    res.json({ total_documentos: docs.length, total_chunks: totalChunks, total_caracteres: docs.reduce((s,d)=>s+(d.total_caracteres||0),0), por_tipo: byTipo });
  } catch(e){ next(e); }
}

// ── Listar contextos de um documento (preview) ───────────────
async function listContextos(req, res, next) {
  try {
    const { dbFindAll } = require('../database/init');
    const contextos = await dbFindAll('rag_contextos')
      .filter(c => c.doc_id === Number(req.params.id));
    res.json({ contextos, total: contextos.length });
  } catch(e){ next(e); }
}

module.exports = { list, upload, reindexar, remove, searchContextos, listContextos, stats };
