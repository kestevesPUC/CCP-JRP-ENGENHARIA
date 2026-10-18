'use strict';
const CrudRepository = require('./CrudRepository');

class CentroRepository extends CrudRepository {
  constructor(db) {
    super(db, 'centros', ['nome']);
  }
}

module.exports = CentroRepository;
