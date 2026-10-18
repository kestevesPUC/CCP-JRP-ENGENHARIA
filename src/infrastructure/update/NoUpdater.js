'use strict';
const ConflictError = require('../../domain/errors/ConflictError');

/** Atualizador "nulo": usado no modo web/desenvolvimento, onde não existe instalação para atualizar. */
class NoUpdater {
  status() {
    return { estado: 'indisponivel', versao: null, progresso: 0, mensagem: 'A atualização automática só funciona no aplicativo instalado.' };
  }

  async check() {
    return this.status();
  }

  installNow() {
    throw new ConflictError('Não há atualização para instalar neste modo de execução.');
  }
}

module.exports = NoUpdater;
