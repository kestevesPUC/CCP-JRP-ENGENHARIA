'use strict';
const ForbiddenError = require('../errors/ForbiddenError');

const { NIVEL_ADMIN } = require('../niveis');

/** Quem pode fazer o quê com títulos (nível A administra; demais só excluem títulos em aberto). */
class TituloPolicy {
  assertCanDelete(user, titulo) {
    if (titulo.baixa && user.nivel !== NIVEL_ADMIN) {
      throw new ForbiddenError('Somente usuários nível A excluem títulos baixados');
    }
  }

  assertCanReverseBaixa(user) {
    if (user.nivel !== NIVEL_ADMIN) throw new ForbiddenError('Somente usuários nível A estornam baixas');
  }
}

module.exports = TituloPolicy;
