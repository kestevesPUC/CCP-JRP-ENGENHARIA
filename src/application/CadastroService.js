'use strict';
const NotFoundError = require('../domain/errors/NotFoundError');
const ConflictError = require('../domain/errors/ConflictError');

/** Casos de uso dos cadastros simples (fornecedores, naturezas, centros); reutilizado via injeção. Toda alteração é auditada. */
class CadastroService {
  /**
   * @param {object} deps
   * @param {string} deps.entity nome da entidade na auditoria (ex.: 'fornecedor')
   * @param {import('../infrastructure/repositories/CrudRepository')} deps.repository
   * @param {import('../domain/validation/FieldSanitizer')} deps.sanitizer
   * @param {(id:number) => boolean} deps.isInUse indica se há títulos vinculados ao registro
   * @param {import('./AuditTrail')} deps.audit
   */
  constructor({ entity, repository, sanitizer, isInUse, audit }) {
    this.entity = entity;
    this.repository = repository;
    this.sanitizer = sanitizer;
    this.isInUse = isInUse;
    this.audit = audit;
  }

  /** Registros com o indicador `emUso` (há títulos vinculados), usado nos filtros da tela. */
  list() {
    return this.repository.findAll().map((record) => ({ ...record, emUso: this.isInUse(record.id) }));
  }

  create(actor, body) {
    const criado = this.repository.create(this.sanitizer.sanitize(body));
    this.#log(actor, 'criar', criado, `${this.#label()} "${criado.nome}" cadastrado`, null, criado);
    return criado;
  }

  update(actor, id, body) {
    const antes = this.#require(id);
    const depois = this.repository.update(id, this.sanitizer.sanitize(body));
    this.#log(actor, 'alterar', depois, `${this.#label()} "${depois.nome}" alterado`, antes, depois);
    return depois;
  }

  remove(actor, id) {
    const antes = this.#require(id);
    if (this.isInUse(Number(id))) throw new ConflictError('Registro possui títulos vinculados e não pode ser excluído');
    this.repository.delete(id);
    this.#log(actor, 'excluir', antes, `${this.#label()} "${antes.nome}" excluído`, antes, null);
    return { ok: true };
  }

  #label() {
    return this.entity.charAt(0).toUpperCase() + this.entity.slice(1);
  }

  #log(actor, acao, record, descricao, antes, depois) {
    this.audit.record({ actor, acao, entidade: this.entity, entidadeId: record.id, descricao, antes, depois });
  }

  #require(id) {
    const record = this.repository.findById(id);
    if (!record) throw new NotFoundError();
    return record;
  }
}

module.exports = CadastroService;
