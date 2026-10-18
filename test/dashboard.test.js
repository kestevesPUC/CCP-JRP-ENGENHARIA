'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createTestApp, novoTitulo } = require('./helpers/createTestApp');

const HOJE = '2026-10-15';

async function seeded() {
  const ctx = await createTestApp({ clock: () => HOJE });
  const c = await ctx.client('ADM', 'segredo1');
  const add = (o) => c('POST', '/api/titulos', novoTitulo({ dtemi: '2026-01-01', ...o }));
  await add({ docum: 'V1', dtvec: '2026-10-05', valor: 100, rateio: [{ cc: 1, valor: 100 }] }); // 10 dias de atraso
  await add({ docum: 'V2', dtvec: '2026-07-01', valor: 200, rateio: [{ cc: 1, valor: 200 }] }); // 106 dias
  await add({ docum: 'H1', dtvec: HOJE, valor: 50, rateio: [{ cc: 2, valor: 50 }] });
  await add({ docum: 'S1', dtvec: '2026-10-20', valor: 70, rateio: [{ cc: 1, valor: 30 }, { cc: 2, valor: 40 }] });
  await add({ docum: 'F1', dtvec: '2026-12-10', valor: 300, rateio: [{ cc: 2, valor: 300 }] });
  const pago = (await add({ docum: 'P1', dtvec: '2026-10-01', valor: 80, rateio: [{ cc: 1, valor: 80 }] })).body;
  await c('POST', `/api/titulos/${pago.id}/baixa`, { dtpag: '2026-10-10', receb: 85, juros: 5, desco: 0, vrche: 85 });
  return { ...ctx, c };
}

test('dashboard calcula indicadores, faixas de atraso e séries mensais', async () => {
  const { c, close } = await seeded();
  const d = (await c('GET', '/api/dashboard?meses=3')).body;

  assert.strictEqual(d.hoje, HOJE);
  assert.strictEqual(d.periodo, 3);
  assert.deepStrictEqual(d.indicadores.abertos, { qtd: 5, valor: 720 });
  assert.deepStrictEqual(d.indicadores.vencidos, { qtd: 2, valor: 300 });
  assert.deepStrictEqual(d.indicadores.hoje, { qtd: 1, valor: 50 });
  assert.deepStrictEqual(d.indicadores.semana, { qtd: 2, valor: 120 }); // hoje + 20/10
  assert.strictEqual(d.indicadores.pagoMes, 85);
  assert.strictEqual(d.indicadores.jurosMes, 5);

  const faixa = Object.fromEntries(d.vencidosPorFaixa.map((f) => [f.faixa, f]));
  assert.strictEqual(faixa['1 a 30 dias'].valor, 100);
  assert.strictEqual(faixa['Mais de 90 dias'].valor, 200);

  assert.deepStrictEqual(d.aVencerPorMes.map((m) => m.mes), ['2026-10', '2026-11', '2026-12']);
  assert.strictEqual(d.aVencerPorMes[0].valor, 120);
  assert.strictEqual(d.aVencerPorMes[2].valor, 300);
  assert.deepStrictEqual(d.pagamentosPorMes.map((m) => m.mes), ['2026-08', '2026-09', '2026-10']);
  assert.strictEqual(d.pagamentosPorMes[2].pago, 85);
  await close();
});

test('dashboard traz rankings (fornecedor, natureza, centro de custo) e próximos vencimentos', async () => {
  const { c, close } = await seeded();
  const d = (await c('GET', '/api/dashboard')).body;
  assert.strictEqual(d.periodo, 6);
  assert.strictEqual(d.topFornecedores[0].nome, 'FORN X');
  assert.strictEqual(d.topFornecedores[0].valor, 720);
  assert.strictEqual(d.indicadores.concentracaoTopFornecedor, 1);
  assert.strictEqual(d.porNatureza[0].valor, 720);
  const centros = Object.fromEntries(d.porCentroCusto.map((x) => [x.nome, x.valor]));
  assert.strictEqual(centros['OBRA 1'], 330); // 100 + 200 + 30
  assert.strictEqual(centros['OBRA 2'], 390); // 50 + 40 + 300
  assert.deepStrictEqual(d.proximosVencimentos.map((t) => t.docum).slice(0, 3), ['V2', 'V1', 'H1']);
  await close();
});

test('dashboard aceita só 3, 6 ou 12 meses e está disponível ao nível Consulta', async () => {
  const { client, close } = await createTestApp();
  const consulta = await client('OPER', 'segredo2');
  assert.strictEqual((await consulta('GET', '/api/dashboard?meses=99')).body.periodo, 6);
  assert.strictEqual((await consulta('GET', '/api/dashboard?meses=12')).body.periodo, 12);
  await close();
});
