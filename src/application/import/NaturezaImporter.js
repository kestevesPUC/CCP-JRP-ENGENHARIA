'use strict';
const SimpleCadastroImporter = require('./SimpleCadastroImporter');
const FieldSanitizer = require('../../domain/validation/FieldSanitizer');
const { NATUREZA_FIELDS } = require('../../domain/cadastros');

class NaturezaImporter extends SimpleCadastroImporter {
  /** @param {{repository: import('../../infrastructure/repositories/NaturezaRepository')}} deps */
  constructor({ repository }) {
    super({ entity: 'naturezas', label: 'Naturezas de pagamento', auditEntity: 'natureza', repository, sanitizer: new FieldSanitizer(NATUREZA_FIELDS) });
  }
}

module.exports = NaturezaImporter;
