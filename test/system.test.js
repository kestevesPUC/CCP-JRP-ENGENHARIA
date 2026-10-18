'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');
const ElectronUpdater = require('../src/desktop/ElectronUpdater');
const DailyBackup = require('../src/infrastructure/backup/DailyBackup');
const SqliteDatabase = require('../src/infrastructure/database/SqliteDatabase');
const { buildApplication } = require('../src/compositionRoot');
const { createTestApp } = require('./helpers/createTestApp');

/** autoUpdater falso com os mesmos eventos do electron-updater. */
function fakeAutoUpdater() {
  const au = new EventEmitter();
  au.checkForUpdates = async () => { au.emit('checking-for-update'); };
  au.quitAndInstall = (...args) => { au.quitArgs = args; };
  return au;
}

test('ElectronUpdater acompanha o ciclo: verificando, disponível, progresso, baixado e instalar', async () => {
  const au = fakeAutoUpdater();
  const downloaded = [];
  const updater = new ElectronUpdater({ autoUpdater: au, logger: { warn() {}, info() {}, error() {} }, onDownloaded: (v) => downloaded.push(v) });
  assert.strictEqual(updater.status().estado, 'idle');
  assert.throws(() => updater.installNow(), /Nenhuma atualização baixada/);

  await updater.check();
  assert.strictEqual(updater.status().estado, 'verificando');
  au.emit('update-available', { version: '2.1.0' });
  au.emit('download-progress', { percent: 41.6 });
  assert.deepStrictEqual([updater.status().estado, updater.status().versao, updater.status().progresso], ['disponivel', '2.1.0', 42]);
  au.emit('update-downloaded', { version: '2.1.0' });
  assert.strictEqual(updater.status().estado, 'baixado');
  assert.deepStrictEqual(downloaded, ['2.1.0']);

  updater.installNow();
  assert.deepStrictEqual(au.quitArgs, [false, true]); // fecha o app e instala; reabre depois
  assert.strictEqual(au.autoInstallOnAppQuit, true);
});

test('ElectronUpdater: sem canal de publicação vira "indisponível"; outros erros viram "erro"', async () => {
  const au = fakeAutoUpdater();
  const updater = new ElectronUpdater({ autoUpdater: au, logger: { warn() {}, info() {}, error() {} } });
  au.checkForUpdates = async () => { throw new Error('ENOENT: no such file or directory, open app-update.yml'); };
  assert.strictEqual((await updater.check()).estado, 'indisponivel');
  au.emit('error', new Error('net::ERR_INTERNET_DISCONNECTED'));
  assert.strictEqual(updater.status().estado, 'erro');
  au.emit('update-not-available');
  assert.strictEqual(updater.status().estado, 'atual');
});

test('GET /api/sistema informa a versão; ações de atualização são do nível A e auditadas', async () => {
  const { client, close } = await createTestApp();
  const oper = await client('OPER', 'segredo2');
  const admin = await client('ADM', 'segredo1');

  const info = (await oper('GET', '/api/sistema')).body;
  assert.match(info.versao, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(info.atualizacao.estado, 'indisponivel'); // modo web: sem atualizador

  assert.strictEqual((await oper('POST', '/api/sistema/atualizacoes/verificar', {})).status, 403);
  assert.strictEqual((await admin('POST', '/api/sistema/atualizacoes/verificar', {})).status, 200);
  assert.strictEqual((await admin('POST', '/api/sistema/atualizacoes/instalar', {})).status, 409);
  assert.ok((await admin('GET', '/api/auditoria')).body.some((e) => e.acao === 'verificar_atualizacao'));
  await close();
});

test('rota de instalar aciona o atualizador injetado', async () => {
  let installed = false;
  const updater = { status: () => ({ estado: 'baixado', versao: '9.9.9' }), check: async () => {}, installNow: () => { installed = true; } };
  const app = buildApplication({ dbFile: ':memory:', logger: { error() {} }, updater, version: '2.0.0' });
  app.adminBootstrap.ensureAdmin();
  app.repositories.usuarios.create({ usuario: 'ADM', nivel: 'A', senha: app.hasher.hash('segredo1'), mustChange: false });
  const { port } = await app.httpServer.listen(0);
  app.httpServer.server.unref();
  const login = await fetch(`http://127.0.0.1:${port}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'ADM', senha: 'segredo1' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const res = await fetch(`http://127.0.0.1:${port}/api/sistema/atualizacoes/instalar`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: '{}' });
  assert.strictEqual(res.status, 200);
  assert.ok(installed);
  await app.httpServer.close();
  app.db.close();
});

test('DailyBackup cria uma cópia por dia, não repete e mantém só as mais recentes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-bk-'));
  const db = new SqliteDatabase(':memory:');
  let day = new Date('2026-10-01T10:00:00Z');
  const backup = new DailyBackup({ db, dir, keep: 3, clock: () => day });

  assert.strictEqual(backup.run().created, true);
  assert.strictEqual(backup.run().created, false, 'segunda execução no mesmo dia não duplica');
  for (let i = 2; i <= 5; i++) { day = new Date(`2026-10-0${i}T10:00:00Z`); backup.run(); }

  const files = fs.readdirSync(dir).sort();
  assert.deepStrictEqual(files, ['ccp-2026-10-03.sqlite', 'ccp-2026-10-04.sqlite', 'ccp-2026-10-05.sqlite']);
  const copy = new SqliteDatabase(path.join(dir, files[0]));
  assert.ok(copy.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n >= 0, 'a cópia é um banco SQLite válido');
  copy.close();
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
