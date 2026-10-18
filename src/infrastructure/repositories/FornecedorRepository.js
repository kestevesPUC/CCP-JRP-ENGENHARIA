'use strict';
const CrudRepository = require('./CrudRepository');
const { FORNECEDOR_FIELDS } = require('../../domain/cadastros');

class FornecedorRepository extends CrudRepository {
  constructor(db) {
    super(db, 'fornecedores', Object.keys(FORNECEDOR_FIELDS));
  }
}

module.exports = FornecedorRepository;
