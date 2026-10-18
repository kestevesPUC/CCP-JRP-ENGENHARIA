'use strict';

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s));
const yearOf = (s) => Number(String(s).slice(0, 4));
const today = () => new Date().toISOString().slice(0, 10);
/** Data válida e a partir de 1990, como exigia o sistema original. */
const isPlausibleDate = (s) => isIsoDate(s) && yearOf(s) >= 1990;

/** Data de nascimento/fundação: ISO válida, de 1900 até hoje. */
const isBirthDate = (s) => isIsoDate(s) && yearOf(s) >= 1900 && s <= today();

module.exports = { isBirthDate, isIsoDate, isPlausibleDate, yearOf, today };
