'use strict';
const CrudRepository = require('./CrudRepository');

class NaturezaRepository extends CrudRepository {
  constructor(db) {
    super(db, 'naturezas', ['nome']);
  }
}

module.exports = NaturezaRepository;
