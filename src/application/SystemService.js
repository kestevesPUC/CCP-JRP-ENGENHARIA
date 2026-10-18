'use strict';

/** Informações do sistema (versão) e controle de atualizações. As ações de atualização ficam restritas ao nível A na rota. */
class SystemService {
  /**
   * @param {object} deps
   * @param {string} deps.version versão do aplicativo (package.json)
   * @param {{status(): object, check(): Promise<object>, installNow(): void}} deps.updater porta de atualização
   * @param {import('./AuditTrail')} deps.audit
   */
  constructor({ version, updater, audit }) {
    this.version = version;
    this.updater = updater;
    this.audit = audit;
  }

  info() {
    return { versao: this.version, atualizacao: this.updater.status() };
  }

  async verificar(actor) {
    await this.updater.check();
    this.audit.record({ actor, acao: 'verificar_atualizacao', entidade: 'sistema', descricao: `Verificação de atualização (versão atual ${this.version})` });
    return this.info();
  }

  instalar(actor) {
    this.audit.record({ actor, acao: 'atualizar', entidade: 'sistema', descricao: `Instalação da atualização ${this.updater.status().versao || ''} solicitada (versão atual ${this.version})`.replace('  ', ' ') });
    this.updater.installNow();
    return { ok: true };
  }
}

module.exports = SystemService;
