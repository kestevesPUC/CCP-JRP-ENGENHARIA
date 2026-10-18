'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createTestApp, novoTitulo } = require('./helpers/createTestApp');

test('exige autenticação e rejeita senha errada', async () => {
  const { client, close } = await createTestApp();
  const anon = await client();
  assert.strictEqual((await anon('GET', '/api/titulos')).status, 401);
  assert.strictEqual((await anon('POST', '/api/login', { usuario: 'ADM', senha: 'x' })).status, 401);
  await close();
});

test('bloqueia o login após 3 tentativas erradas', async () => {
  const { client, close } = await createTestApp();
  const anon = await client();
  for (let i = 0; i < 3; i++) await anon('POST', '/api/login', { usuario: 'OPER', senha: 'errada' });
  assert.strictEqual((await anon('POST', '/api/login', { usuario: 'OPER', senha: 'segredo2' })).status, 429);
  await close();
});

test('rateio deve somar o valor e não repetir centro de custo', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  assert.strictEqual((await c('POST', '/api/titulos', novoTitulo({ rateio: [{ cc: 1, valor: 60 }] }))).status, 400);
  assert.strictEqual((await c('POST', '/api/titulos', novoTitulo({ rateio: [{ cc: 1, valor: 50 }, { cc: 1, valor: 50 }] }))).status, 400);
  const ok = await c('POST', '/api/titulos', novoTitulo({ rateio: [{ cc: 1, valor: 60 }, { cc: 2, valor: 40 }] }));
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.docum, 'NF1');
  assert.deepStrictEqual(ok.body.rateio, [{ cc: 1, valor: 60 }, { cc: 2, valor: 40 }]);
  await close();
});

test('baixa exige pago - juros + desconto = valor; título baixado não é alterado', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const { body: t } = await c('POST', '/api/titulos', novoTitulo());
  const ruim = await c('POST', `/api/titulos/${t.id}/baixa`, { dtpag: '2030-01-10', receb: 100, juros: 5, desco: 0, vrche: 100 });
  assert.strictEqual(ruim.status, 400);
  const boa = await c('POST', `/api/titulos/${t.id}/baixa`, { dtpag: '2030-01-10', receb: 105, juros: 5, desco: 0, vrche: 105 });
  assert.strictEqual(boa.status, 200);
  assert.strictEqual(boa.body.baixa.juros, 5);
  assert.strictEqual((await c('PUT', `/api/titulos/${t.id}`, novoTitulo())).status, 409);
  await close();
});

test('somente nível A exclui título baixado ou estorna baixa', async () => {
  const { client, close } = await createTestApp();
  const admin = await client('ADM', 'segredo1');
  const oper = await client('OPER', 'segredo2');
  const { body: t } = await admin('POST', '/api/titulos', novoTitulo());
  await admin('POST', `/api/titulos/${t.id}/baixa`, { dtpag: '2030-01-10', receb: 100, juros: 0, desco: 0, vrche: 100 });
  assert.strictEqual((await oper('DELETE', `/api/titulos/${t.id}`)).status, 403);
  assert.strictEqual((await oper('POST', `/api/titulos/${t.id}/estorno`, {})).status, 403);
  assert.strictEqual((await admin('POST', `/api/titulos/${t.id}/estorno`, {})).body.baixa, null);
  assert.strictEqual((await admin('DELETE', `/api/titulos/${t.id}`)).status, 200);
  await close();
});

test('cadastro em uso não pode ser excluído; relatório de vencimentos soma apenas abertos', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  await c('POST', '/api/titulos', novoTitulo());
  assert.strictEqual((await c('DELETE', '/api/fornecedores/1')).status, 409);
  const rel = await c('GET', '/api/relatorios/vencimentos?de=2030-01-01&ate=2030-12-31');
  assert.strictEqual(rel.body.rows.length, 1);
  assert.strictEqual(rel.body.total, 100);
  await close();
});

test('usuários e backup são restritos ao nível A', async () => {
  const { client, close } = await createTestApp();
  const oper = await client('OPER', 'segredo2');
  const admin = await client('ADM', 'segredo1');
  assert.strictEqual((await oper('GET', '/api/usuarios')).status, 403);
  assert.strictEqual((await oper('GET', '/api/backup')).status, 403);
  const backup = await admin('GET', '/api/backup');
  assert.strictEqual(backup.status, 200);
  assert.match(backup.headers.get('content-disposition'), /\.sqlite"/);
  await close();
});
