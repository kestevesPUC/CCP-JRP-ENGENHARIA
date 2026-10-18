'use strict';

const BOM = '﻿';
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Gera CSV compatível com Excel pt-BR: UTF-8 com BOM, separador ";", decimais com vírgula, datas dd/mm/aaaa.
 * Colunas: { header, value: (linha) => any, type?: 'text' | 'money' | 'date' | 'int' }.
 */
class CsvWriter {
  constructor({ delimiter = ';', eol = '\r\n' } = {}) {
    this.delimiter = delimiter;
    this.eol = eol;
  }

  build(columns, rows) {
    const lines = [columns.map((c) => this.#quote(c.header)).join(this.delimiter)];
    for (const row of rows) lines.push(columns.map((c) => this.#format(c, row)).join(this.delimiter));
    return BOM + lines.join(this.eol) + this.eol;
  }

  #format(column, row) {
    const value = column.value(row);
    if (value === null || value === undefined || value === '') return '';
    switch (column.type) {
      case 'money': return Number(value).toFixed(2).replace('.', ',');
      case 'int': return String(Number(value));
      case 'date': return String(value).split('-').reverse().join('/');
      default: return this.#quote(String(value));
    }
  }

  /** Aspas quando necessário e neutralização de "injeção de fórmula" (=, +, -, @) em planilhas. */
  #quote(text) {
    const safe = FORMULA_START.test(text) ? `'${text}` : text;
    return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }
}

module.exports = CsvWriter;
