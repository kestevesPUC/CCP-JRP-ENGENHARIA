'use strict';

class DashboardController {
  /** @param {import('../../../application/DashboardService')} service */
  constructor(service) {
    this.service = service;
  }

  register(router) {
    router.add('GET', '/api/dashboard', (ctx) => this.service.obter(ctx.query.meses));
  }
}

module.exports = DashboardController;
