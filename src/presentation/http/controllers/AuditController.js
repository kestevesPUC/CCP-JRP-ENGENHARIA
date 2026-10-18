'use strict';

/** Consulta da auditoria — somente nível A. Não há rotas de alteração: a trilha é imutável. */
class AuditController {
  /** @param {import('../../../application/AuditService')} service */
  constructor(service) {
    this.service = service;
  }

  register(router) {
    const admin = { nivel: 'A' };
    router.add('GET', '/api/auditoria', (ctx) => this.service.list(ctx.query), admin);
    router.add('GET', '/api/auditoria/opcoes', () => this.service.options(), admin);
    router.add('GET', '/api/auditoria/:id', (ctx) => this.service.get(ctx.params.id), admin);
  }
}

module.exports = AuditController;
