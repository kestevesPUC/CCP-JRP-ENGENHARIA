'use strict';
const UsuarioService = require('../../../application/UsuarioService');

class AuthController {
  /** @param {import('../../../application/AuthService')} authService */
  constructor(authService) {
    this.authService = authService;
  }

  register(router) {
    router.add('POST', '/api/login', (ctx) => this.#login(ctx), { public: true });
    router.add('POST', '/api/logout', (ctx) => this.#logout(ctx), { public: true });
    router.add('GET', '/api/me', (ctx) => UsuarioService.toPublic(ctx.user), { allowMustChange: true });
    router.add('POST', '/api/me/senha', (ctx) => this.#changePassword(ctx), { allowMustChange: true, selfService: true });
  }

  #login(ctx) {
    const { user, token } = this.authService.login(ctx.body.usuario, ctx.body.senha);
    ctx.setCookie(token);
    return UsuarioService.toPublic(user);
  }

  #logout(ctx) {
    this.authService.logout(ctx.token, ctx.user);
    ctx.setCookie('', 0);
    return { ok: true };
  }

  #changePassword(ctx) {
    this.authService.changePassword(ctx.user, ctx.body.atual, ctx.body.nova);
    return { ok: true };
  }
}

module.exports = AuthController;
