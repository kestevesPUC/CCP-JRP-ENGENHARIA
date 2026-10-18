'use strict';
const test = require('node:test');
const assert = require('node:assert');
const CsvWriter = require('../src/infrastructure/csv/CsvWriter');
const { createTestApp, novoTitulo } = require('./helpers/createTestApp');

test('CsvWriter: BOM, separador ";", decimais pt-BR, datas e escape de aspas', () => {
  const csv = new CsvWriter().build(
    [
      { header: 'Nome', value: (r) => r.nome, type: 'text' },
      { header: 'Valor', value: (r) => r.valor, type: 'money' },
      { header: 'Data', value: (r) => r.data, type: 'date' },
    ],
    [{ nome: 'A "B"; C', valor: 1234.5, data: '2030-01-10' }],
  );
  assert.ok(csv.startsWith('﻿Nome;Valor;Data\r\n'));
  assert.ok(csv.includes('"A ""B""; C";1234,50;10/01/2030'));
});

test('CsvWriter: neutraliza injeção de fórmula', () => {
  const csv = new CsvWriter().build([{ header: 'x', value: (r) => r, type: 'text' }], ['=HYPERLINK("http://x")', '+1', 'ok']);
  const lines = csv.split('\r\n');
  assert.ok(lines[1].startsWith('"\'=HYPERLINK'));
  assert.strictEqual(lines[2], "'+1");
  assert.strictEqual(lines[3], 'ok');
});

test('GET /api/exportar/titulos gera CSV com os filtros da listagem', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  await c('POST', '/api/titulos', novoTitulo({ docum: 'AAA', valor: 100, rateio: [{ cc: 1, valor: 100 }] }));
  await c('POST', '/api/titulos', novoTitulo({ docum: 'BBB', valor: 50, rateio: [{ cc: 1, valor: 50 }] }));
  const res = await c('GET', '/api/exportar/titulos?docum=BBB');
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.headers.get('content-disposition'), /titulos\.csv/);
  assert.ok(res.body.includes('BBB'));
  assert.ok(!res.body.includes('AAA'));
  assert.ok(res.body.includes('50,00'));
  await close();
});

test('exporta cadastros e relatórios em CSV; entidade inexistente retorna 404', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const forn = await c('GET', '/api/exportar/fornecedores');
  assert.ok(forn.body.includes('FORN X'));
  await c('POST', '/api/titulos', novoTitulo());
  const rel = await c('GET', '/api/relatorios/vencimentos?formato=csv');
  assert.match(rel.headers.get('content-disposition'), /relatorio-vencimentos\.csv/);
  assert.ok(rel.body.includes('NF1'));
  assert.strictEqual((await c('GET', '/api/exportar/inexistente')).status, 404);
  await close();
});
