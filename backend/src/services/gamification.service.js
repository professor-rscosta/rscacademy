/**
 * RSC Academy — Gamification Service
 * XP, Níveis, Medalhas, Missões, Ranking
 */
const { dbFindAll, dbFindWhere, dbFindOne, dbInsert, dbUpdate } = require('../database/init');

// ─── Level table ─────────────────────────────────────────────
const LEVELS = [
  { nivel:1, label:'Iniciante',     emoji:'🌱', xp_min:0    },
  { nivel:2, label:'Aprendiz',      emoji:'📘', xp_min:200  },
  { nivel:3, label:'Intermediário', emoji:'⚡', xp_min:500  },
  { nivel:4, label:'Avançado',      emoji:'🔥', xp_min:1000 },
  { nivel:5, label:'Expert',        emoji:'💎', xp_min:2000 },
  { nivel:6, label:'Mestre',        emoji:'👑', xp_min:4000 },
  { nivel:7, label:'Lendário',      emoji:'🏆', xp_min:8000 },
];

function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (const lv of LEVELS) {
    if (xp >= lv.xp_min) current = lv;
  }
  const nextLv = LEVELS.find(l => l.xp_min > xp);
  const progress = nextLv
    ? Math.round(((xp - current.xp_min) / (nextLv.xp_min - current.xp_min)) * 100)
    : 100;
  return { ...current, xp_next: nextLv?.xp_min || null, progress_pct: progress };
}

// ─── Award XP + check level up ───────────────────────────────
function awardXP(userId, xpAmount) {
  const users = dbFindAll('usuarios');
  const user = users.find(u => u.id === Number(userId));
  if (!user) return null;

  const oldXP    = user.xp_total || 0;
  const newXP    = oldXP + xpAmount;
  const oldLevel = getLevelInfo(oldXP);
  const newLevel = getLevelInfo(newXP);

  dbUpdate('usuarios', userId, { xp_total: newXP, nivel: newLevel.nivel });

  return {
    xp_anterior: oldXP,
    xp_novo: newXP,
    xp_ganho: xpAmount,
    nivel_anterior: oldLevel,
    nivel_novo: newLevel,
    subiu_nivel: newLevel.nivel > oldLevel.nivel,
  };
}

// ─── Check & grant medals ─────────────────────────────────────
function checkMedals(userId) {
  const user     = dbFindAll('usuarios').find(u => u.id === Number(userId));
  if (!user) return [];

  const configs  = dbFindAll('medalhas_config');
  const already  = dbFindWhere('medalhas_aluno', m => m.aluno_id === Number(userId)).map(m => m.medalha_id);
  const respostas = dbFindAll('respostas').filter(r => r.aluno_id === Number(userId));
  const tentativas = dbFindAll('tentativas').filter(t => t.aluno_id === Number(userId) && t.status === 'concluida');

  const novas = [];
  for (const cfg of configs) {
    if (already.includes(cfg.id)) continue;
    let ganhou = false;
    switch (cfg.criterio) {
      case 'total_respostas': ganhou = respostas.length >= cfg.valor; break;
      case 'xp_total':        ganhou = (user.xp_total||0) >= cfg.valor; break;
      case 'theta':           ganhou = (user.theta||0) >= cfg.valor; break;
      case 'streak':          ganhou = (user.streak_atual||0) >= cfg.valor; break;
      case 'nota_maxima':
        ganhou = tentativas.some(t => (t.nota||0) >= cfg.valor); break;
      case 'trilha_completa':
        // Check if any trilha was 100% completed
        const trilhas = dbFindAll('trilhas');
        const questoesMap = {};
        for (const t of trilhas) {
          const qs = dbFindAll('questoes').filter(q => q.trilha_id === t.id && q.ativo !== false);
          const rs = respostas.filter(r => r.trilha_id === t.id && r.is_correct);
          const unique = new Set(rs.map(r => r.questao_id));
          if (qs.length > 0 && unique.size >= qs.length) { ganhou = true; break; }
        }
        break;
    }
    if (ganhou) {
      dbInsert('medalhas_aluno', { aluno_id: Number(userId), medalha_id: cfg.id, conquistada_em: new Date().toISOString() });
      awardXP(userId, cfg.xp_bonus || 0);
      novas.push(cfg);
    }
  }
  return novas;
}

// ─── Get user gamification profile ───────────────────────────
function getGamificationProfile(userId) {
  const user = dbFindAll('usuarios').find(u => u.id === Number(userId));
  if (!user) return null;

  const xpInfo   = getLevelInfo(user.xp_total || 0);
  const medalhas = dbFindWhere('medalhas_aluno', m => m.aluno_id === Number(userId))
    .map(m => {
      const cfg = dbFindAll('medalhas_config').find(c => c.id === m.medalha_id);
      return cfg ? { ...cfg, conquistada_em: m.conquistada_em } : null;
    }).filter(Boolean);

  // Ranking position
  const todos = dbFindAll('usuarios').filter(u => u.perfil === 'aluno' && u.status === 'ativo');
  const sorted = todos.sort((a, b) => (b.xp_total||0) - (a.xp_total||0));
  const posicao = sorted.findIndex(u => u.id === Number(userId)) + 1;

  // Respostas stats
  const respostas = dbFindAll('respostas').filter(r => r.aluno_id === Number(userId));
  const corretas = respostas.filter(r => r.is_correct).length;

  return {
    xp_total:   user.xp_total || 0,
    nivel:      xpInfo,
    posicao_ranking: posicao,
    total_alunos: sorted.length,
    streak_atual: user.streak_atual || 0,
    total_respostas: respostas.length,
    taxa_acerto: respostas.length > 0 ? Math.round(corretas / respostas.length * 100) : 0,
    medalhas,
    total_medalhas_disponiveis: dbFindAll('medalhas_config').length,
  };
}

// ─── Rankings ─────────────────────────────────────────────────
function getRanking(limit = 10) {
  return dbFindAll('usuarios')
    .filter(u => u.perfil === 'aluno' && u.status === 'ativo')
    .sort((a, b) => (b.xp_total||0) - (a.xp_total||0))
    .slice(0, limit)
    .map((u, i) => ({
      posicao: i + 1,
      id: u.id, nome: u.nome,
      xp_total: u.xp_total || 0,
      nivel: getLevelInfo(u.xp_total || 0),
      theta: u.theta || 0,
    }));
}

// ─── Update streak ────────────────────────────────────────────
function updateStreak(userId) {
  const user = dbFindAll('usuarios').find(u => u.id === Number(userId));
  if (!user) return;
  const hoje = new Date().toDateString();
  const ultima = user.ultima_atividade ? new Date(user.ultima_atividade).toDateString() : null;
  let streak = user.streak_atual || 0;
  let streakMax = user.streak_maximo || 0;
  if (ultima !== hoje) {
    const ontem = new Date(Date.now() - 86400000).toDateString();
    streak = ultima === ontem ? streak + 1 : 1;
    streakMax = Math.max(streakMax, streak);
    dbUpdate('usuarios', userId, { streak_atual: streak, streak_maximo: streakMax, ultima_atividade: new Date().toISOString() });
  }
  return streak;
}

module.exports = { getLevelInfo, awardXP, checkMedals, getGamificationProfile, getRanking, updateStreak, LEVELS };
