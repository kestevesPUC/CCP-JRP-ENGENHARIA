'use strict';
const NotFoundError = require('../domain/errors/NotFoundError');

/** Consulta da trilha de auditoria (restrita ao nível A na rota). */
class AuditService {
  /** @param {{repository: import('../infrastructure/repositories/AuditRepository')}} deps */
  constructor({ repository }) {
    this.repository = repository;
  }

  list(filters) {
    return this.repository.search(filters);
  }

  get(id) {
    const entry = this.repository.findById(id);
    if (!entry) throw new NotFoundError('Registro de auditoria não encontrado');
    return entry;
  }

  /** Opções dos filtros (usuários, ações e entidades já registrados). */
  options() {
    return {
      usuarios: this.repository.distinct('usuario'),
      acoes: this.repository.distinct('acao'),
      entidades: this.repository.distinct('entidade'),
    };
  }
}

module.exports = AuditService;
