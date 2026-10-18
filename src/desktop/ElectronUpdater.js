'use strict';
const ConflictError = require('../domain/errors/ConflictError');

// Mensagens em português para cada estado (exibidas na tela "Sobre / Atualizações").
const MESSAGES = {
  idle: 'Nenhuma verificação feita ainda.',
  verificando: 'Procurando atualizações…',
  atual: 'Você está usando a versão mais recente.',
  disponivel: 'Nova versão encontrada; baixando em segundo plano…',
  baixado: 'Atualização baixada e pronta para instalar.',
  indisponivel: 'Este aplicativo foi gerado sem canal de atualização.',
  erro: 'Não foi possível verificar atualizações agora.',
};

/**
 * Auto-atualização do aplicativo instalado, em cima do `electron-updater`.
 * Ao publicar uma nova versão no canal configurado (release.config.json), os aplicativos instalados a baixam
 * sozinhos e oferecem a instalação; se o usuário não instalar na hora, ela é aplicada ao fechar o programa.
 */
class ElectronUpdater {
  /**
   * @param {object} deps
   * @param {import('electron-updater').AppUpdater} deps.autoUpdater
   * @param {Pick<Console,'info'|'warn'|'error'>} [deps.logger]
   * @param {(version:string) => void} [deps.onDownloaded] chamado quando a atualização termina de baixar
   */
  constructor({ autoUpdater, logger = console, onDownloaded = () => {} }) {
    this.updater = autoUpdater;
    this.logger = logger;
    this.state = { estado: 'idle', versao: null, progresso: 0, mensagem: MESSAGES.idle };

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = logger;

    autoUpdater.on('checking-for-update', () => this.#set('verificando'));
    autoUpdater.on('update-available', (info) => this.#set('disponivel', { versao: info.version, progresso: 0 }));
    autoUpdater.on('update-not-available', () => this.#set('atual'));
    autoUpdater.on('download-progress', (p) => this.#set('disponivel', { progresso: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (info) => {
      this.#set('baixado', { versao: info.version, progresso: 100 });
      onDownloaded(info.version);
    });
    autoUpdater.on('error', (error) => this.#fail(error));
  }

  status() {
    return { ...this.state };
  }

  async check() {
    try {
      await this.updater.checkForUpdates();
    } catch (error) {
      this.#fail(error);
    }
    return this.status();
  }

  installNow() {
    if (this.state.estado !== 'baixado') throw new ConflictError('Nenhuma atualização baixada para instalar.');
    this.updater.quitAndInstall(false, true);
  }

  #set(estado, extra = {}) {
    this.state = { ...this.state, ...extra, estado, mensagem: MESSAGES[estado] };
  }

  #fail(error) {
    const noFeed = /app-update\.yml|ENOENT|No published versions|Cannot find channel/i.test(String(error?.message));
    this.logger.warn?.(`[atualização] ${error?.message || error}`);
    this.#set(noFeed ? 'indisponivel' : 'erro');
  }
}

module.exports = ElectronUpdater;
