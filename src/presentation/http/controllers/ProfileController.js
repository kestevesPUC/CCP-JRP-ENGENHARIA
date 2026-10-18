'use strict';
const FileResponse = require('../FileResponse');
const UsuarioService = require('../../../application/UsuarioService');

/** Foto do perfil: o próprio usuário envia/remove (qualquer nível); qualquer usuário logado vê as fotos. */
class ProfileController {
  /** @param {import('../../../application/ProfilePhotoService')} photoService */
  constructor(photoService) {
    this.photoService = photoService;
  }

  register(router) {
    router.add('POST', '/api/me/foto', (ctx) => UsuarioService.toPublic(this.photoService.save(ctx.user, ctx.body.foto)), { selfService: true });
    router.add('DELETE', '/api/me/foto', (ctx) => UsuarioService.toPublic(this.photoService.remove(ctx.user)), { selfService: true });
    router.add('GET', '/api/usuarios/:id/foto', (ctx) => {
      const { tipo, dados, extensao } = this.photoService.get(ctx.params.id);
      return new FileResponse({
        filename: `foto-${ctx.params.id}.${extensao}`, contentType: tipo, body: dados, disposition: 'inline', cacheControl: 'private, max-age=86400',
      });
    });
  }
}

module.exports = ProfileController;
