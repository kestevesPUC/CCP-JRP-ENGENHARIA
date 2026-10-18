'use strict';

const DAY_MS = 86_400_000;
const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const toUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);

/**
 * Próximo aniversário de `birthIso` a partir de `todayIso` (inclusive).
 * Quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos.
 * @returns {{data: string, dias: number, anos: number}} data (ISO) do próximo aniversário, dias até lá e idade/tempo que completa.
 */
function nextBirthday(birthIso, todayIso) {
  const [birthYear, month, day] = birthIso.split('-').map(Number);
  const todayYear = Number(todayIso.slice(0, 4));
  const on = (year) => {
    const d = month === 2 && day === 29 && !isLeap(year) ? 28 : day;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  let date = on(todayYear);
  if (date < todayIso) date = on(todayYear + 1);
  return { data: date, dias: Math.round((toUtc(date) - toUtc(todayIso)) / DAY_MS), anos: Number(date.slice(0, 4)) - birthYear };
}

module.exports = { nextBirthday };
