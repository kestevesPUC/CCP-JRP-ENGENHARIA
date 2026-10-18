'use strict';
const ValidationError = require('../errors/ValidationError');

/** Normaliza (trim, caixa alta, tamanho máximo) os campos de um cadastro simples. */
class FieldSanitizer {
  /** @param {Record<string, number>} fields campo -> tamanho máximo */
  constructor(fields, requiredField = 'nome') {
    this.fields = fields;
    this.requiredField = requiredField;
  }

  sanitize(body) {
    const clean = {};
    for (const [name, maxLength] of Object.entries(this.fields)) {
      clean[name] = String(body[name] ?? '').trim().toUpperCase().slice(0, maxLength);
    }
    if (!clean[this.requiredField]) throw new ValidationError('Nome é obrigatório');
    return clean;
  }
}

module.exports = FieldSanitizer;
