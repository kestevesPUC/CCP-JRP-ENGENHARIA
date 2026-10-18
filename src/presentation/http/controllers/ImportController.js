'use strict';
const FileResponse = require('../FileResponse');

/**
 * Importação por CSV. O modelo (GET) fica liberado a quem acessa a tela; o envio (POST) segue a regra
 * geral: o nível Consulta não grava.
 */
class ImportController {
  /** @param {import('../../../application/import/CsvImportService')} service */
  constructor(service) {
    this.service = service;
  }

  register(router) {
    router.add('GET', '/api/importar/:entidade/modelo', (ctx) => {
      const { filename, csv } = this.service.template(ctx.params.entidade);
      return FileResponse.csv(filename, csv);
    });
    router.add('GET', '/api/importar/:entidade', (ctx) => this.service.describe(ctx.params.entidade));
    router.add('POST', '/api/importar/:entidade', (ctx) => this.service.run(ctx.params.entidade, ctx.body.csv, { actor: ctx.user, confirmar: ctx.body.confirmar === true }));
  }
}

module.exports = ImportController;
