'use strict';

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s));
const yearOf = (s) => Number(String(s).slice(0, 4));
const today = () => new Date().toISOString().slice(0, 10);
/** Data válida e a partir de 1990, como exigia o sistema original. */
const isPlausibleDate = (s) => isIsoDate(s) && yearOf(s) >= 1990;

module.exports = { isIsoDate, isPlausibleDate, yearOf, today };
