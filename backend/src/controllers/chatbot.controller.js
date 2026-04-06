const aiService = require('../services/ai.service');
const userRepo  = require('../repositories/user.repository');
const respostaRepo = require('../repositories/resposta.repository');

async function chat(req, res, next) {
  try {
    const { mensagem, historico = [] } = req.body;
    if (!mensagem?.trim()) return res.status(400).json({ error: 'Mensagem é obrigatória.' });

    // Contexto do aluno para personalizar respostas
    const user = userRepo.findById(req.user.id);
    const respostas = respostaRepo.findByAluno(req.user.id);
    const contexto = {
      nome: user?.nome,
      perfil: user?.perfil,
      total_respostas: respostas.length,
      taxa_acerto: respostas.length > 0
        ? Math.round(respostas.filter(r => r.is_correct).length / respostas.length * 100) + '%'
        : '0%',
    };

    const resposta = await aiService.chatWithStudent({
      historico,
      pergunta: mensagem,
      contexto_usuario: contexto,
    });

    res.json({ resposta });
  } catch(e) {
    if (e.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ error: 'Assistente de IA não configurado. Configure OPENAI_API_KEY no .env do backend.' });
    }
    next(e);
  }
}

module.exports = { chat };
