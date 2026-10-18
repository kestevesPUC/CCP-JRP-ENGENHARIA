'use strict';
const SimpleCadastroImporter = require('./SimpleCadastroImporter');
const FieldSanitizer = require('../../domain/validation/FieldSanitizer');
const { CENTRO_FIELDS } = require('../../domain/cadastros');

class CentroImporter extends SimpleCadastroImporter {
  /** @param {{repository: import('../../infrastructure/repositories/CentroRepository')}} deps */
  constructor({ repository }) {
    super({ entity: 'centros', label: 'Centros de custo', auditEntity: 'centro', repository, sanitizer: new FieldSanitizer(CENTRO_FIELDS) });
  }
}

module.exports = CentroImporter;
