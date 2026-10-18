'use strict';

const DELIMITERS = [';', ',', '\t'];

/**
 * Leitor de CSV (RFC 4180 simplificado): aspas com "" escapado, quebras de linha dentro de aspas,
 * BOM UTF-8 e detecção automática do separador (; , ou tab), como o Excel pt-BR costuma gerar.
 */
class CsvParser {
  /** @returns {string[][]} linhas de células (sem linhas totalmente vazias) */
  parse(text) {
    const source = String(text ?? '').replace(/^﻿/, '');
    const delimiter = this.#detectDelimiter(source);
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"' && source[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delimiter) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && source[i + 1] === '\n') i += 1;
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  }

  /** Escolhe o separador mais frequente na primeira linha (fora de aspas). */
  #detectDelimiter(source) {
    const counts = Object.fromEntries(DELIMITERS.map((d) => [d, 0]));
    let quoted = false;
    for (const ch of source) {
      if (ch === '"') quoted = !quoted;
      else if (!quoted && (ch === '\n' || ch === '\r')) break;
      else if (!quoted && ch in counts) counts[ch] += 1;
    }
    return DELIMITERS.reduce((best, d) => (counts[d] > counts[best] ? d : best), ';');
  }
}

module.exports = CsvParser;
