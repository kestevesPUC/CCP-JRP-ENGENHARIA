'use strict';

/** Versão do sistema (qualquer usuário logado) e atualizações (nível A). */
class SystemController {
  /** @param {import('../../../application/SystemService')} service */
  constructor(service) {
    this.service = service;
  }

  register(router) {
    const admin = { nivel: 'A' };
    router.add('GET', '/api/sistema', () => this.service.info());
    router.add('POST', '/api/sistema/atualizacoes/verificar', (ctx) => this.service.verificar(ctx.user), admin);
    router.add('POST', '/api/sistema/atualizacoes/instalar', (ctx) => this.service.instalar(ctx.user), admin);
  }
}

module.exports = SystemController;
