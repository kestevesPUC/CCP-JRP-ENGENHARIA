'use strict';
const FileResponse = require('../FileResponse');

class RelatorioController {
  /**
   * @param {import('../../../application/RelatorioService')} relatorioService
   * @param {import('../../../application/ExportService')} exportService
   */
  constructor(relatorioService, exportService) {
    this.relatorioService = relatorioService;
    this.exportService = exportService;
  }

  register(router) {
    router.add('GET', '/api/relatorios/:tipo', (ctx) => {
      const relatorio = this.relatorioService.gerar(ctx.params.tipo, ctx.query);
      if (ctx.query.formato !== 'csv') return relatorio;
      const { filename, csv } = this.exportService.exportarRelatorio(relatorio);
      return FileResponse.csv(filename, csv);
    });
  }
}

module.exports = RelatorioController;
