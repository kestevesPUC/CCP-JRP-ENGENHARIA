'use strict';
const ValidationError = require('../../domain/errors/ValidationError');
const { isPlausibleDate } = require('../../domain/dates');

/** Chave de comparação de cabeçalhos/nomes: minúsculas, sem acentos e sem pontuação ("Insc. estadual" -> "inscestadual"). */
const key = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * "1.234,56", "1234,56", "1234.56" ou "R$ 1.234,56" -> número (reais). Vazio -> null.
 * Um único ponto seguido de exatamente 3 dígitos é tratado como separador de milhar ("1.234" = 1234).
 */
function parseMoney(text, field = 'Valor') {
  const raw = String(text ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (raw === '') return null;
  if (!/^-?[\d.,]+$/.test(raw)) throw new ValidationError(`${field}: "${text}" não é um valor numérico`);
  let normalized;
  if (raw.includes(',')) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, '');
  else normalized = raw;
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new ValidationError(`${field}: "${text}" não é um valor numérico`);
  return number;
}

/** "31/12/2026" ou "2026-12-31" -> "2026-12-31". Vazio -> null. */
function parseDate(text, field = 'Data') {
  const raw = String(text ?? '').trim();
  if (raw === '') return null;
  let iso = raw;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (br) iso = `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  if (!isPlausibleDate(iso) || new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) {
    throw new ValidationError(`${field}: "${text}" não é uma data válida (use dd/mm/aaaa)`);
  }
  return iso;
}

const isBlank = (value) => String(value ?? '').trim() === '';

module.exports = { key, parseMoney, parseDate, isBlank };
