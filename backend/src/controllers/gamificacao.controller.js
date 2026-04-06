const gamifService = require('../services/gamification.service');
const { dbFindAll, dbFindWhere } = require('../database/init');

async function meuPerfil(req, res, next) {
  try {
    const perfil = gamifService.getGamificationProfile(req.user.id);
    if (!perfil) return res.status(404).json({ error: 'Perfil não encontrado.' });
    res.json(perfil);
  } catch(e){ next(e); }
}

async function ranking(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 10;
    const lista = gamifService.getRanking(limit);
    res.json({ ranking: lista });
  } catch(e){ next(e); }
}

async function medalhas(req, res, next) {
  try {
    const todas     = dbFindAll('medalhas_config');
    const minhas    = dbFindWhere('medalhas_aluno', m => m.aluno_id === req.user.id);
    const minhosIds = minhas.map(m => m.medalha_id);
    const resultado = todas.map(m => ({
      ...m,
      conquistada:    minhosIds.includes(m.id),
      conquistada_em: minhas.find(ma => ma.medalha_id === m.id)?.conquistada_em || null,
    }));
    res.json({ medalhas: resultado });
  } catch(e){ next(e); }
}

async function missoes(req, res, next) {
  try {
    const todas = dbFindAll('missoes').filter(m => m.ativo);
    const minhas = dbFindWhere('missoes_aluno', m => m.aluno_id === req.user.id);
    const respostas = dbFindAll('respostas').filter(r => r.aluno_id === req.user.id);
    const hoje = new Date().toDateString();

    const resultado = todas.map(missao => {
      const prog = minhas.find(m => m.missao_id === missao.id);
      let progresso = 0;
      let concluida = false;

      if (missao.meta_tipo === 'total_respostas') {
        if (missao.tipo === 'diaria') {
          progresso = respostas.filter(r => new Date(r.created_at).toDateString() === hoje).length;
        } else {
          progresso = respostas.length;
        }
        concluida = progresso >= missao.meta_valor;
      } else if (missao.meta_tipo === 'streak') {
        const user = dbFindAll('usuarios').find(u => u.id === req.user.id);
        progresso = user?.streak_atual || 0;
        concluida = progresso >= missao.meta_valor;
      }

      return {
        ...missao,
        progresso: Math.min(progresso, missao.meta_valor),
        concluida,
        pct: Math.round(Math.min(progresso / missao.meta_valor, 1) * 100),
        recompensa_coletada: prog?.recompensa_coletada || false,
      };
    });
    res.json({ missoes: resultado });
  } catch(e){ next(e); }
}

module.exports = { meuPerfil, ranking, medalhas, missoes };
