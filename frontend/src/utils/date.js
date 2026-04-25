/**
 * RSC Academy — Utilitários de data
 */

/**
 * Formata data para exibição em pt-BR
 * @param {string|Date} date
 * @param {boolean} showTime
 * @returns {string}
 */
export function fmtDate(date, showTime = false) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' };
    if (showTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    return d.toLocaleDateString('pt-BR', opts);
  } catch { return String(date); }
}

/**
 * Data relativa: "há 2 dias", "em 3 dias"
 */
export function fmtRelative(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    const diff = Math.round((d - Date.now()) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    if (diff > 0) return `em ${diff} dias`;
    return `há ${Math.abs(diff)} dias`;
  } catch { return String(date); }
}

/**
 * Formata data/hora completa
 */
export function fmtDateTime(date) { return fmtDate(date, true); }
