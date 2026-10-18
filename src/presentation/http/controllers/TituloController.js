'use strict';

class TituloController {
  /** @param {import('../../../application/TituloService')} service */
  constructor(service) {
    this.service = service;
  }

  register(router) {
    router.add('GET', '/api/titulos', (ctx) => this.service.list(ctx.query));
    router.add('POST', '/api/titulos', (ctx) => this.service.create(ctx.user, ctx.body));
    router.add('PUT', '/api/titulos/:id', (ctx) => this.service.update(ctx.user, ctx.params.id, ctx.body));
    router.add('DELETE', '/api/titulos/:id', (ctx) => this.service.remove(ctx.user, ctx.params.id));
    router.add('POST', '/api/titulos/:id/baixa', (ctx) => this.service.baixar(ctx.user, ctx.params.id, ctx.body));
    router.add('POST', '/api/titulos/:id/estorno', (ctx) => this.service.estornar(ctx.user, ctx.params.id));
    router.add('POST', '/api/titulos/:id/reprogramar', (ctx) => this.service.reprogramar(ctx.user, ctx.params.id, ctx.body));
  }
}

module.exports = TituloController;
