'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createTestApp, novoTitulo } = require('./helpers/createTestApp');
const ProfilePhotoValidator = require('../src/domain/validation/ProfilePhotoValidator');
const ValidationError = require('../src/domain/errors/ValidationError');

// PNG 1x1 válido
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const pngDataUrl = `data:image/png;base64,${PNG.toString('base64')}`;

test('ProfilePhotoValidator aceita imagem válida e rejeita tipo, assinatura e tamanho inválidos', () => {
  const v = new ProfilePhotoValidator();
  assert.deepStrictEqual(v.parse(pngDataUrl).tipo, 'image/png');
  assert.throws(() => v.parse('data:text/html;base64,PGgxPg=='), ValidationError);
  assert.throws(() => v.parse(`data:image/png;base64,${Buffer.from('nao sou png').toString('base64')}`), /não é uma imagem válida/);
  assert.throws(() => v.parse(`data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(400 * 1024)]).toString('base64')}`), /muito grande/);
});

test('usuário envia, consulta e remove a própria foto; /api/me reflete temFoto', async () => {
  const { client, close } = await createTestApp();
  const oper = await client('OPER', 'segredo2');
  assert.strictEqual((await oper('GET', '/api/me')).body.temFoto, false);
  assert.strictEqual((await oper('GET', '/api/usuarios/2/foto')).status, 404);

  const saved = await oper('POST', '/api/me/foto', { foto: pngDataUrl });
  assert.strictEqual(saved.status, 200);
  assert.strictEqual(saved.body.temFoto, true);
  assert.ok(saved.body.fotoVersao);

  const img = await oper('GET', '/api/usuarios/2/foto');
  assert.strictEqual(img.status, 200);
  assert.match(img.headers.get('content-type'), /image\/png/);
  assert.match(img.headers.get('content-disposition'), /^inline/);

  assert.strictEqual((await oper('POST', '/api/me/foto', { foto: 'data:text/html;base64,PGgxPg==' })).status, 400);
  assert.strictEqual((await oper('DELETE', '/api/me/foto')).body.temFoto, false);
  await close();
});

test('nível C (consulta) é somente leitura, mas pode trocar a própria foto e senha', async () => {
  const { client, close } = await createTestApp();
  const admin = await client('ADM', 'segredo1');
  const consulta = await client('OPER', 'segredo2'); // OPER tem nível C
  assert.strictEqual((await consulta('GET', '/api/titulos')).status, 200);
  assert.strictEqual((await consulta('GET', '/api/exportar/titulos')).status, 200);
  const bloqueado = await consulta('POST', '/api/titulos', novoTitulo());
  assert.strictEqual(bloqueado.status, 403);
  assert.match(bloqueado.body.error, /Consulta/);
  assert.strictEqual((await consulta('POST', '/api/fornecedores', { nome: 'X' })).status, 403);
  assert.strictEqual((await consulta('POST', '/api/me/foto', { foto: pngDataUrl })).status, 200);
  assert.strictEqual((await consulta('POST', '/api/me/senha', { atual: 'segredo2', nova: 'novasenha1' })).status, 200);
  assert.strictEqual((await admin('POST', '/api/titulos', novoTitulo())).status, 200);
  await close();
});

test('migração adiciona colunas de foto a um banco já existente', async () => {
  const SqliteDatabase = require('../src/infrastructure/database/SqliteDatabase');
  const db = new SqliteDatabase(':memory:');
  const columns = db.prepare('PRAGMA table_info(usuarios)').all().map((c) => c.name);
  assert.ok(['foto', 'foto_tipo', 'foto_em'].every((c) => columns.includes(c)));
  assert.strictEqual(db.prepare('PRAGMA user_version').get().user_version, require('../src/infrastructure/database/migrations').length);
  db.close();
});
