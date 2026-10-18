'use strict';

/** Rotas CRUD de um cadastro simples (/api/<recurso>); uma instância por recurso. */
class CadastroController {
  /**
   * @param {string} resource nome da rota (ex.: 'fornecedores')
   * @param {import('../../../application/CadastroService')} service
   */
  constructor(resource, service) {
    this.resource = resource;
    this.service = service;
  }

  register(router) {
    const base = `/api/${this.resource}`;
    router.add('GET', base, () => this.service.list());
    router.add('POST', base, (ctx) => this.service.create(ctx.user, ctx.body));
    router.add('PUT', `${base}/:id`, (ctx) => this.service.update(ctx.user, ctx.params.id, ctx.body));
    router.add('DELETE', `${base}/:id`, (ctx) => this.service.remove(ctx.user, ctx.params.id));
  }
}

module.exports = CadastroController;
