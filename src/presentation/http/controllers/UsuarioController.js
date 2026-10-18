'use strict';
const FileResponse = require('../FileResponse');

/** Administração de usuários e backup — restritos ao nível A. */
class UsuarioController {
  /**
   * @param {import('../../../application/UsuarioService')} usuarioService
   * @param {import('../../../application/BackupService')} backupService
   */
  constructor(usuarioService, backupService) {
    this.usuarioService = usuarioService;
    this.backupService = backupService;
  }

  register(router) {
    const admin = { nivel: 'A' };
    router.add('GET', '/api/usuarios', () => this.usuarioService.list(), admin);
    router.add('POST', '/api/usuarios', (ctx) => this.usuarioService.create(ctx.user, ctx.body), admin);
    router.add('PUT', '/api/usuarios/:id', (ctx) => this.usuarioService.update(ctx.user, ctx.params.id, ctx.body), admin);
    router.add('POST', '/api/usuarios/:id/senha', (ctx) => this.usuarioService.resetPassword(ctx.user, ctx.params.id, ctx.body), admin);
    router.add('PUT', '/api/me', (ctx) => this.usuarioService.updateSelf(ctx.user, ctx.body), { selfService: true });
    router.add('DELETE', '/api/usuarios/:id', (ctx) => this.usuarioService.remove(ctx.user, ctx.params.id), admin);
    router.add('GET', '/api/backup', (ctx) => {
      const { filename, content } = this.backupService.gerar(ctx.user);
      return new FileResponse({ filename, contentType: 'application/x-sqlite3', body: content });
    }, admin);
  }
}

module.exports = UsuarioController;
