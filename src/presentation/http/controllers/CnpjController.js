'use strict';

class CnpjController {
  /** @param {import('../../../application/CnpjLookupService')} service */
  constructor(service) {
    this.service = service;
  }

  register(router) {
    router.add('GET', '/api/cnpj/:cnpj', (ctx) => this.service.lookup(ctx.params.cnpj));
  }
}

module.exports = CnpjController;
