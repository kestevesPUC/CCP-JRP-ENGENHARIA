'use strict';
const ValidationError = require('../../domain/errors/ValidationError');
const { key } = require('./importHelpers');

/** Importador base dos cadastros de uma coluna (naturezas e centros de custo): "Descrição" sem repetição. */
class SimpleCadastroImporter {
  /**
   * @param {object} deps
   * @param {string} deps.entity identificador na rota (ex.: 'naturezas')
   * @param {string} deps.label nome para mensagens
   * @param {string} deps.auditEntity nome na auditoria
   * @param {import('../../infrastructure/repositories/CrudRepository')} deps.repository
   * @param {import('../../domain/validation/FieldSanitizer')} deps.sanitizer
   */
  constructor({ entity, label, auditEntity, repository, sanitizer }) {
    this.entity = entity;
    this.label = label;
    this.auditEntity = auditEntity;
    this.repository = repository;
    this.sanitizer = sanitizer;
    this.columns = [{ header: 'Descrição', example: 'EXEMPLO - APAGUE ESTA LINHA', required: true, aliases: ['Nome'] }];
  }

  /** Prepara o contexto de uma importação (descrições já cadastradas). */
  begin() {
    return { seen: new Set(this.repository.findAll().map((r) => key(r.nome))) };
  }

  /** @returns {{record: object, summary: string}} @throws {ValidationError} */
  parse(row, context) {
    const record = this.sanitizer.sanitize({ nome: row['Descrição'] });
    const k = key(record.nome);
    if (context.seen.has(k)) throw new ValidationError(`"${record.nome}" já existe`);
    context.seen.add(k);
    return { record, summary: record.nome };
  }

  commit(records) {
    return records.map((record) => this.repository.create(record));
  }
}

module.exports = SimpleCadastroImporter;
