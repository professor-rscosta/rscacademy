/**
 * RSC Academy — Serviço de Calibração TRI
 * Roda calibração automática quando questão atinge 30+ respostas
 */
const { dbFindWhere, dbUpdate } = require('../database/init');
const { calibrateItem }         = require('./tri.service');

const MIN_RESPOSTAS = 30;
const DIFF_THRESHOLD = 0.2; // só atualiza se diferença > 20%

/**
 * Verifica e roda calibração para uma questão específica
 */
async function checkAndCalibrate(questaoId) {
  const respostas = dbFindWhere('respostas', r => r.questao_id === Number(questaoId));
  if (respostas.length < MIN_RESPOSTAS) return null;

  const questao = dbFindWhere('questoes', q => q.id === Number(questaoId))[0];
  if (!questao) return null;
  if (questao.tri?.status === 'calibrado' && respostas.length - (questao.tri.total_respostas || 0) < 15) return null;

  const novosParams = calibrateItem(respostas, questao.tri);
  if (!novosParams) return null;

  // Só atualiza se houve mudança significativa
  const diffA = Math.abs(novosParams.a - questao.tri.a);
  const diffB = Math.abs(novosParams.b - questao.tri.b);
  if (diffA < DIFF_THRESHOLD && diffB < DIFF_THRESHOLD && questao.tri.status === 'calibrado') {
    return { sem_mudanca: true };
  }

  const triAtualizado = { ...questao.tri, ...novosParams };
  dbUpdate('questoes', questaoId, { tri: triAtualizado });

  console.log(`✅ Calibração TRI: questão #${questaoId} atualizada — a:${novosParams.a} b:${novosParams.b}`);
  return novosParams;
}

/**
 * Roda calibração em todas as questões elegíveis (job periódico)
 */
async function runBatchCalibration() {
  const questoes = dbFindWhere('questoes', q => q.ativo);
  let calibradas = 0;
  for (const q of questoes) {
    const result = await checkAndCalibrate(q.id);
    if (result && !result.sem_mudanca) calibradas++;
  }
  console.log(`Calibração batch: ${calibradas} questões atualizadas`);
  return calibradas;
}

module.exports = { checkAndCalibrate, runBatchCalibration };
