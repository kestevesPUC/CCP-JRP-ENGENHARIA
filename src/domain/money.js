'use strict';
// Valores monetários trafegam como reais (number) na API e são persistidos em centavos inteiros.

const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (cents) => cents / 100;
/** 1234.5 -> "R$ 1.234,50" (para mensagens e descrições). */
const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

module.exports = { toCents, fromCents, formatMoney };
