/**
 * RSC Academy — TRI Service
 * Implementação completa dos 4 modelos TRI:
 *  1PL (Rasch), 2PL, 3PL, GRM (Graded Response Model)
 *
 * + Estimação theta via EAP (Expected A Posteriori)
 * + Calibração simplificada via MLE
 * + Pontuação parcial para questões compostas
 */

// ─── Theta grid para EAP ─────────────────────────────────────
const THETA_GRID = [];
for (let t = -4; t <= 4; t += 0.1) THETA_GRID.push(Math.round(t * 10) / 10);

// ─── Modelos TRI ─────────────────────────────────────────────

/** 1PL Rasch: P(θ) = 1 / (1 + e^-(θ-b)) */
function p1PL(theta, b) {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/** 2PL: P(θ) = 1 / (1 + e^-a(θ-b)) */
function p2PL(theta, a, b) {
  return 1 / (1 + Math.exp(-a * (theta - b)));
}

/** 3PL: P(θ) = c + (1-c) * 1/(1+e^-a(θ-b)) */
function p3PL(theta, a, b, c) {
  return c + (1 - c) * (1 / (1 + Math.exp(-a * (theta - b))));
}

/** GRM — probabilidade de score >= k */
function pGRMboundary(theta, a, bk) {
  return 1 / (1 + Math.exp(-a * (theta - bk)));
}

/** GRM — probabilidade exata de score = k (entre 0 e K) */
function pGRM(theta, a, bkArray) {
  const K = bkArray.length; // número de limiares
  const cumProbs = [1, ...bkArray.map(bk => pGRMboundary(theta, a, bk)), 0];
  return Array.from({ length: K + 1 }, (_, k) => Math.max(0, cumProbs[k] - cumProbs[k + 1]));
}

/**
 * Calcula P(resposta correta) dado theta e parâmetros TRI da questão
 */
function calculateP(theta, tri) {
  const { modelo, a = 1, b = 0, c = 0 } = tri;
  switch (modelo) {
    case '1PL': return p1PL(theta, b);
    case '2PL': return p2PL(theta, a, b);
    case '3PL': return p3PL(theta, a, b, c);
    case 'GRM': return p2PL(theta, a, b); // para binário usa 2PL; pontuação parcial via pGRM
    default:    return p2PL(theta, a, b);
  }
}

// ─── Pontuação parcial ───────────────────────────────────────

/**
 * Calcula score normalizado [0,1] para questões com pontuação parcial
 */
function scorePartial(tipo, resposta, gabarito) {
  try {
    switch (tipo) {
      case 'multipla_escolha':
      case 'verdadeiro_falso':
        return resposta === gabarito ? 1 : 0;

      case 'preenchimento': {
        const r = String(resposta).trim().toLowerCase();
        const g = String(gabarito).trim().toLowerCase();
        return r === g ? 1 : (r.includes(g) || g.includes(r) ? 0.5 : 0);
      }

      case 'associacao': {
        // gabarito: { "0": 2, "1": 3, ... } (esq→dir indices)
        if (typeof gabarito !== 'object' || typeof resposta !== 'object') return 0;
        const keys = Object.keys(gabarito);
        const corretas = keys.filter(k => String(resposta[k]) === String(gabarito[k])).length;
        return corretas / keys.length;
      }

      case 'ordenacao': {
        // gabarito: [3,0,2,1] (posição correta de cada item)
        if (!Array.isArray(gabarito) || !Array.isArray(resposta)) return 0;
        const n = gabarito.length;
        let corretas = 0;
        for (let i = 0; i < n; i++) {
          if (String(resposta[i]) === String(gabarito[i])) corretas++;
        }
        return corretas / n;
      }

      case 'dissertativa':
      case 'upload_arquivo':
        // Avaliação por IA → score vem de fora
        return typeof resposta === 'number' ? Math.max(0, Math.min(1, resposta)) : 0;

      default:
        return resposta === gabarito ? 1 : 0;
    }
  } catch {
    return 0;
  }
}

// ─── Estimação theta (EAP) ───────────────────────────────────

/**
 * Estima theta do aluno via EAP (Expected A Posteriori)
 * @param {Array} responses - [{ tri, score }] onde score ∈ [0,1]
 * @param {number} priorMean - média da prior (default 0)
 * @param {number} priorSd   - desvio da prior (default 1)
 * @returns {number} theta estimado
 */
function estimateTheta(responses, priorMean = 0, priorSd = 1) {
  if (!responses || responses.length === 0) return priorMean;

  // Prior: distribuição normal
  const prior = THETA_GRID.map(t => {
    const z = (t - priorMean) / priorSd;
    return Math.exp(-0.5 * z * z);
  });
  const priorSum = prior.reduce((a, b) => a + b, 0);

  // Likelihood L(θ) = ∏ P(θ)^score * (1-P(θ))^(1-score)
  const logLik = THETA_GRID.map(theta => {
    let logL = 0;
    for (const { tri, score } of responses) {
      if (!tri) continue;
      const p = Math.max(1e-10, Math.min(1 - 1e-10, calculateP(theta, tri)));
      // Pontuação parcial: usa log-likelihood contínua
      logL += score * Math.log(p) + (1 - score) * Math.log(1 - p);
    }
    return logL;
  });

  // Posteror ∝ Likelihood × Prior
  const maxLogL = Math.max(...logLik);
  const posterior = logLik.map((l, i) => Math.exp(l - maxLogL) * (prior[i] / priorSum));
  const postSum = posterior.reduce((a, b) => a + b, 0);

  if (postSum < 1e-15) return priorMean;

  // EAP: E[θ|dados] = Σ θ × P(θ|dados)
  const theta = THETA_GRID.reduce((acc, t, i) => acc + t * posterior[i] / postSum, 0);
  return Math.round(theta * 1000) / 1000;
}

/**
 * Calcula desvio padrão posterior (incerteza da estimativa)
 */
function thetaStdError(responses, theta, priorSd = 1) {
  if (!responses || responses.length === 0) return priorSd;
  // Informação de Fisher: I(θ) = Σ [P'(θ)]² / [P(θ)(1-P(θ))]
  let info = 1 / (priorSd * priorSd); // prior contribution
  for (const { tri, score } of responses) {
    if (!tri) continue;
    const { a = 1, modelo } = tri;
    const p = Math.max(1e-10, Math.min(1 - 1e-10, calculateP(theta, tri)));
    const D = modelo === '3PL' ? 1.7 : 1;
    const pPrime = D * a * p * (1 - p);
    info += (pPrime * pPrime) / (p * (1 - p));
  }
  return Math.round((1 / Math.sqrt(Math.max(info, 1e-6))) * 1000) / 1000;
}

// ─── Curva característica para visualização ──────────────────

/**
 * Gera pontos para plotar a ICC (Item Characteristic Curve)
 * @returns {Array} [{x: theta, y: probabilidade}]
 */
function generateCurvePoints(tri, range = [-4, 4], steps = 80) {
  const points = [];
  const step = (range[1] - range[0]) / steps;
  for (let t = range[0]; t <= range[1]; t += step) {
    points.push({ x: Math.round(t * 100) / 100, y: Math.round(calculateP(t, tri) * 1000) / 1000 });
  }
  return points;
}

// ─── Calibração automática (MLE simplificado) ───────────────

/**
 * Estima parâmetros TRI a partir de respostas reais
 * Usa método dos momentos + ajuste iterativo simples
 * Em produção: usar biblioteca como node-ltm ou chamar R via child_process
 */
function calibrateItem(respostas, triAtual) {
  const n = respostas.length;
  if (n < 30) return null; // mínimo de respostas

  const { modelo } = triAtual;
  const scores = respostas.map(r => r.score);
  const thetas = respostas.map(r => r.theta_momento || 0);

  // Proporção de acerto total
  const pTotal = scores.reduce((a, b) => a + b, 0) / n;

  // Estimativa b: theta onde P(θ)=0.5 (interpolação)
  const sorted = thetas.slice().sort((a, b) => a - b);
  const medianTheta = sorted[Math.floor(n / 2)];

  // Estimativa c (3PL): proporção de acertos com theta muito baixo (< -2)
  const lowThetaResps = respostas.filter(r => (r.theta_momento || 0) < -2);
  const cEst = lowThetaResps.length > 5
    ? Math.min(0.35, lowThetaResps.reduce((acc, r) => acc + r.score, 0) / lowThetaResps.length)
    : triAtual.c;

  // Estimativa a: baseada na discriminação observada
  // Compara acerto no quartil superior vs inferior de theta
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const lowGroup  = respostas.filter(r => (r.theta_momento || 0) < q1);
  const highGroup = respostas.filter(r => (r.theta_momento || 0) > q3);

  let aEst = triAtual.a;
  if (lowGroup.length > 3 && highGroup.length > 3) {
    const pLow  = lowGroup.reduce((acc, r) => acc + r.score, 0) / lowGroup.length;
    const pHigh = highGroup.reduce((acc, r) => acc + r.score, 0) / highGroup.length;
    const diff = Math.max(0.01, pHigh - pLow);
    aEst = Math.max(0.5, Math.min(3.0, diff * 4)); // heurística
  }

  return {
    modelo,
    a: Math.round(aEst * 100) / 100,
    b: Math.round(medianTheta * 100) / 100,
    c: modelo === '3PL' ? Math.round(cEst * 100) / 100 : 0,
    status: 'calibrado',
    total_respostas: n,
    calibrado_em: new Date().toISOString(),
  };
}

// ─── Theta → nível gamificado ────────────────────────────────

function thetaToLevel(theta) {
  if (theta <= -2.5) return { nivel: 1, label: 'Iniciante',    cor: '#94a3b8', emoji: '🌱' };
  if (theta <= -1.5) return { nivel: 2, label: 'Básico',       cor: '#60a5fa', emoji: '📘' };
  if (theta <= -0.5) return { nivel: 3, label: 'Intermediário',cor: '#34d399', emoji: '⚡' };
  if (theta <=  0.5) return { nivel: 4, label: 'Avançado',     cor: '#fbbf24', emoji: '🔥' };
  if (theta <=  1.5) return { nivel: 5, label: 'Expert',       cor: '#f97316', emoji: '💎' };
  if (theta <=  2.5) return { nivel: 6, label: 'Mestre',       cor: '#a855f7', emoji: '👑' };
  return                     { nivel: 7, label: 'Lendário',    cor: '#ef4444', emoji: '🏆' };
}

/**
 * XP ganho baseado na performance e dificuldade TRI
 * Questões mais difíceis para o aluno atual geram mais XP
 */
function calculateXP(xpBase, score, theta, triB) {
  const difficultyBonus = Math.max(0, triB - theta); // mais bônus se dificuldade > theta
  const xp = xpBase * score * (1 + difficultyBonus * 0.2);
  return Math.round(Math.max(0, Math.min(xpBase * 2, xp)));
}

/**
 * Verifica se a resposta do aluno está correta para cada tipo de questão.
 * Retorna true/false.
 */
function checkResposta(tipo, gabarito, resposta) {
  if (resposta === null || resposta === undefined) return false;
  try {
    switch (tipo) {
      case 'multipla_escolha':
        return Number(resposta) === Number(gabarito);

      case 'verdadeiro_falso':
        return String(resposta).toLowerCase() === String(gabarito).toLowerCase();

      case 'preenchimento':
        return String(resposta).trim().toLowerCase() === String(gabarito).trim().toLowerCase();

      case 'associacao': {
        // gabarito: {0:X,1:Y,...} — resposta igual
        const gab = typeof gabarito === 'string' ? JSON.parse(gabarito) : gabarito;
        const res = typeof resposta === 'string' ? JSON.parse(resposta) : resposta;
        return Object.keys(gab).every(k => String(res[k]) === String(gab[k]));
      }

      case 'ordenacao': {
        // gabarito: array de índices [2,0,3,1]
        const gab = typeof gabarito === 'string' ? JSON.parse(gabarito) : gabarito;
        const res = typeof resposta === 'string' ? JSON.parse(resposta) : resposta;
        if (!Array.isArray(gab) || !Array.isArray(res)) return false;
        return gab.length === res.length && gab.every((v, i) => Number(v) === Number(res[i]));
      }

      case 'dissertativa':
      case 'upload_arquivo':
        // Avaliação aberta — sempre retorna false aqui (avaliada pela IA separadamente)
        return false;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

module.exports = {
  calculateP, p1PL, p2PL, p3PL, pGRM, pGRMboundary,
  estimateTheta, thetaStdError, scorePartial,
  generateCurvePoints, calibrateItem,
  thetaToLevel, calculateXP, checkResposta,
};
