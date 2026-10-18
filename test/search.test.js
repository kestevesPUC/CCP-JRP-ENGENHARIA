'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createTestApp, novoTitulo } = require('./helpers/createTestApp');

async function seeded() {
  const ctx = await createTestApp();
  const c = await ctx.client('ADM', 'segredo1');
  await c('POST', '/api/fornecedores', { nome: 'Granitos Ação Ltda' });
  await c('POST', '/api/titulos', novoTitulo({ docum: 'AAA1', histo: 'compra de chapas', valor: 800, rateio: [{ cc: 1, valor: 800 }] }));
  await c('POST', '/api/titulos', novoTitulo({ docum: 'BBB2', histo: 'frete', valor: 1003.12, codig: 2, rateio: [{ cc: 1, valor: 1003.12 }] }));
  return { ...ctx, c };
}

test('busca livre (q) procura em documento, histórico, fornecedor e valor', async () => {
  const { c, close } = await seeded();
  const ids = async (qs) => (await c('GET', `/api/titulos?${qs}`)).body.map((t) => t.docum);
  assert.deepStrictEqual(await ids('q=chapas'), ['AAA1']);
  assert.deepStrictEqual(await ids('q=bbb'), ['BBB2']);
  assert.deepStrictEqual(await ids('q=ação'), ['BBB2']);
  assert.deepStrictEqual(await ids(`q=${encodeURIComponent('1.003,12')}`), ['BBB2']);
  assert.deepStrictEqual(await ids('q=800'), ['AAA1']);
  assert.deepStrictEqual(await ids('q=inexistente'), []);
  await close();
});

test('busca livre combina com filtros e é aplicada na exportação CSV', async () => {
  const { c, close } = await seeded();
  assert.deepStrictEqual((await c('GET', '/api/titulos?q=a&codig=2')).body.map((t) => t.docum), ['BBB2']);
  const csv = (await c('GET', '/api/exportar/titulos?q=frete')).body;
  assert.ok(csv.includes('BBB2') && !csv.includes('AAA1'));
  await close();
});

test('cadastros informam se estão em uso (títulos vinculados)', async () => {
  const { c, close } = await seeded();
  const fornecedores = (await c('GET', '/api/fornecedores')).body;
  assert.strictEqual(fornecedores.find((f) => f.nome === 'FORN X').emUso, true);
  assert.strictEqual(fornecedores.find((f) => f.nome.startsWith('GRANITOS')).emUso, true);
  const novo = (await c('POST', '/api/centros', { nome: 'Sem uso' })).body;
  assert.strictEqual((await c('GET', '/api/centros')).body.find((x) => x.id === novo.id).emUso, false);
  await close();
});
