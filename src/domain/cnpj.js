'use strict';
// CNPJ numérico e alfanumérico (novo formato): 12 caracteres [0-9A-Z] + 2 dígitos verificadores numéricos.
// O valor de cada caractere no cálculo é (código ASCII - 48), o que mantém o cálculo antigo para dígitos.

const WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove máscara e põe em caixa alta: "12.345.678/0001-95" -> "12345678000195". */
const normalizeCnpj = (value) => String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

function checkDigit(chars, weights) {
  const sum = chars.reduce((acc, ch, i) => acc + (ch.charCodeAt(0) - 48) * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** @param {string} value CNPJ com ou sem máscara */
function isValidCnpj(value) {
  const cnpj = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const chars = [...cnpj];
  const first = checkDigit(chars.slice(0, 12), WEIGHTS_1);
  const second = checkDigit(chars.slice(0, 13), WEIGHTS_2);
  return first === Number(chars[12]) && second === Number(chars[13]);
}

/** CNPJ (14) ou CPF (11) sem máscara -> com máscara; outros tamanhos voltam como vieram. */
function formatDocument(digits) {
  const d = normalizeCnpj(digits);
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return String(digits || '');
}

module.exports = { normalizeCnpj, isValidCnpj, formatDocument };
