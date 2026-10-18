'use strict';
// Casca desktop (Electron): sobe o servidor local numa porta livre e abre a janela do app.
const { app, BrowserWindow, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { buildApplication } = require('./src/compositionRoot');
const DailyBackup = require('./src/infrastructure/backup/DailyBackup');

// PASTA DE DADOS FIXA — não altere. É aqui que fica o banco (ccp.sqlite). O instalador NÃO a remove ao desinstalar,
// então reinstalar ou atualizar o programa mantém todos os dados. (--user-data-dir ou CCP_USER_DATA servem só para testes.)
if (!app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', process.env.CCP_USER_DATA || path.join(app.getPath('appData'), 'ccp-node'));
}

if (!app.requestSingleInstanceLock()) app.quit();

const SIX_HOURS = 6 * 60 * 60 * 1000;
let win;
let application;
const timers = [];

/** Atualizador real só no aplicativo instalado; no desenvolvimento a aplicação usa o atualizador nulo. */
function createUpdater() {
  if (!app.isPackaged) return undefined;
  const { autoUpdater } = require('electron-updater'); // eslint-disable-line global-require
  const ElectronUpdater = require('./src/desktop/ElectronUpdater'); // eslint-disable-line global-require
  return new ElectronUpdater({
    autoUpdater,
    onDownloaded: async (version) => {
      const { response } = await dialog.showMessageBox(win, {
        type: 'info', title: 'Atualização disponível', message: `A versão ${version} foi baixada.`,
        detail: 'Reinicie o programa para instalar. Se preferir, ela será instalada automaticamente quando você fechar o CCP.',
        buttons: ['Reiniciar e instalar agora', 'Depois'], defaultId: 0, cancelId: 1,
      });
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    },
  });
}

function scheduleMaintenance(updater) {
  const backup = new DailyBackup({ db: application.db, dir: path.join(app.getPath('documents'), 'CCP Backups') });
  const runBackup = () => { try { backup.run(); } catch (error) { console.error('[backup]', error.message); } };
  runBackup();
  timers.push(setInterval(runBackup, 60 * 60 * 1000));

  if (updater) {
    timers.push(setTimeout(() => updater.check(), 5_000));
    timers.push(setInterval(() => updater.check(), SIX_HOURS));
  }
}

async function boot() {
  const dbFile = path.join(app.getPath('userData'), 'ccp.sqlite');
  // Em desenvolvimento, aproveita o banco já importado em ./data
  const seed = path.join(__dirname, 'data', 'ccp.sqlite');
  if (!fs.existsSync(dbFile) && !app.isPackaged && fs.existsSync(seed)) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    fs.copyFileSync(seed, dbFile);
  }
  const updater = createUpdater();
  application = buildApplication({ dbFile, ...(updater && { updater }) });
  const password = application.adminBootstrap.ensureAdmin();
  const { port } = await application.httpServer.listen(0);
  const url = `http://127.0.0.1:${port}`;

  if (password) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Primeiro acesso',
      message: 'Usuário inicial criado',
      detail: `Usuário: ADMIN\nSenha provisória: ${password}\n\nA troca da senha é obrigatória no primeiro acesso.`,
    });
  }

  Menu.setApplicationMenu(null);
  const windowTitle = `CCP — Contas a Pagar · v${app.getVersion()}`;
  win = new BrowserWindow({ icon: path.join(__dirname, 'public', 'img', 'icon.png'), width: 1280, height: 820, minWidth: 360, minHeight: 480, title: windowTitle, autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } });
  // A página tem o próprio <title>; mantém na barra do app o nome com a versão.
  win.on('page-title-updated', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(url)) event.preventDefault();
  });
  win.loadURL(url);
  scheduleMaintenance(updater);
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.whenReady().then(boot);
app.on('window-all-closed', async () => {
  timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  if (application) {
    await application.httpServer.close();
    application.db.close();
  }
  app.quit();
});
