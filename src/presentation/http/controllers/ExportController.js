'use strict';
const FileResponse = require('../FileResponse');
const ForbiddenError = require('../../../domain/errors/ForbiddenError');
const { NIVEL_ADMIN } = require('../../../domain/niveis');

// Exportações restritas ao nível A.
const ADMIN_ONLY = new Set(['auditoria']);

/** Exportações CSV: GET /api/exportar/<fornecedores|naturezas|centros|titulos|auditoria> (títulos e auditoria aceitam os filtros da listagem). */
class ExportController {
  /** @param {import('../../../application/ExportService')} exportService */
  constructor(exportService) {
    this.exportService = exportService;
  }

  register(router) {
    router.add('GET', '/api/exportar/:entidade', (ctx) => {
      if (ADMIN_ONLY.has(ctx.params.entidade) && ctx.user.nivel !== NIVEL_ADMIN) throw new ForbiddenError(`Acesso restrito ao nível ${NIVEL_ADMIN}`);
      const { filename, csv } = this.exportService.exportar(ctx.params.entidade, ctx.query);
      return FileResponse.csv(filename, csv);
    });
  }
}

module.exports = ExportController;
