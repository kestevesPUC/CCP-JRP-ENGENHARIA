'use strict';

class DashboardController {
  /**
   * @param {import('../../../application/DashboardService')} service
   * @param {import('../../../application/BirthdayService')} birthdays
   */
  constructor(service, birthdays) {
    this.service = service;
    this.birthdays = birthdays;
  }

  register(router) {
    router.add('GET', '/api/dashboard', (ctx) => this.service.obter(ctx.query.meses));
    // Aniversariantes da semana: alerta destinado aos administradores.
    router.add('GET', '/api/aniversarios', () => this.birthdays.proximos(), { nivel: 'A' });
  }
}

module.exports = DashboardController;
