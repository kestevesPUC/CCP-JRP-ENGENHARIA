'use strict';
const test = require('node:test');
const assert = require('node:assert');
const CsvParser = require('../src/infrastructure/csv/CsvParser');
const { parseMoney, parseDate } = require('../src/application/import/importHelpers');
const { createTestApp } = require('./helpers/createTestApp');

const run = (c, entity, csv, confirmar = false) => c('POST', `/api/importar/${entity}`, { csv, confirmar });

test('CsvParser: separadores ; , e tab, BOM, aspas e quebras de linha em células', () => {
  const p = new CsvParser();
  assert.deepStrictEqual(p.parse('﻿a;b;c\r\n1;2;3\r\n'), [['a', 'b', 'c'], ['1', '2', '3']]);
  assert.deepStrictEqual(p.parse('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
  assert.deepStrictEqual(p.parse('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
  assert.deepStrictEqual(p.parse('x;y\n"a;b";"diz ""oi""\nok"\n'), [['x', 'y'], ['a;b', 'diz "oi"\nok']]);
  assert.deepStrictEqual(p.parse('a;b\n\n;\n1;2'), [['a', 'b'], ['1', '2']]); // linhas vazias ignoradas
});

test('parseMoney e parseDate aceitam os formatos brasileiros e ISO', () => {
  assert.strictEqual(parseMoney('1.234,56'), 1234.56);
  assert.strictEqual(parseMoney('R$ 1.234,56'), 1234.56);
  assert.strictEqual(parseMoney('1234,5'), 1234.5);
  assert.strictEqual(parseMoney('1234.56'), 1234.56);
  assert.strictEqual(parseMoney('1.234'), 1234);
  assert.strictEqual(parseMoney(''), null);
  assert.throws(() => parseMoney('abc'), /valor numérico/);
  assert.strictEqual(parseDate('31/12/2026'), '2026-12-31');
  assert.strictEqual(parseDate('2026-12-31'), '2026-12-31');
  assert.strictEqual(parseDate(''), null);
  assert.throws(() => parseDate('31/02/2026'), /data válida/);
});

test('modelos de todas as telas estão disponíveis para download em CSV', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  for (const entity of ['fornecedores', 'naturezas', 'centros', 'titulos']) {
    const res = await c('GET', `/api/importar/${entity}/modelo`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-disposition'), new RegExp(`modelo-importacao-${entity}\\.csv`));
    assert.ok(res.body.split('\r\n').length >= 2, 'cabeçalho + linha de exemplo');
  }
  assert.strictEqual((await c('GET', '/api/importar/usuarios/modelo')).status, 404);
  await close();
});

test('o modelo baixado, sem alterações, é lido pelo importador (cabeçalhos coerentes)', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const template = (await c('GET', '/api/importar/fornecedores/modelo')).body;
  const preview = (await run(c, 'fornecedores', template)).body;
  assert.strictEqual(preview.total, 1);
  assert.strictEqual(preview.validos, 1);
  assert.strictEqual(preview.totalErros, 0);
  await close();
});

test('fornecedores: validação sem gravar, erros por linha e importação tudo-ou-nada', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const csv = [
    'CNPJ/CPF;Nome;Cidade;UF',
    '11.222.333/0001-81;Empresa Alfa;Belo Horizonte;mg',
    '11222333000182;CNPJ errado;X;MG',
    '11.222.333/0001-81;Duplicado no arquivo;X;MG',
    ';Sem documento;;',
    ';;;',
  ].join('\n');

  const preview = (await run(c, 'fornecedores', csv)).body;
  assert.strictEqual(preview.total, 4);
  assert.strictEqual(preview.validos, 2);
  assert.deepStrictEqual(preview.erros.map((e) => e.linha), [3, 4]);
  assert.match(preview.erros[0].mensagem, /CNPJ inválido/);
  assert.match(preview.erros[1].mensagem, /já cadastrado/);
  assert.strictEqual((await c('GET', '/api/fornecedores')).body.length, 1, 'a validação não grava nada');

  const rejected = await run(c, 'fornecedores', csv, true);
  assert.strictEqual(rejected.status, 400);
  assert.match(rejected.body.error, /nada foi importado/);
  assert.strictEqual((await c('GET', '/api/fornecedores')).body.length, 1);

  const ok = await run(c, 'fornecedores', 'CNPJ/CPF;Nome;UF\n11.222.333/0001-81;Empresa Alfa;mg\n;Pessoa sem doc;', true);
  assert.strictEqual(ok.body.importados, 2);
  const nova = (await c('GET', '/api/fornecedores')).body.find((f) => f.nome === 'EMPRESA ALFA');
  assert.strictEqual(nova.pess, 'J');
  assert.strictEqual(nova.esta, 'MG');
  assert.strictEqual(nova.cgc, '11.222.333/0001-81');
  await close();
});

test('naturezas e centros: importa descrições e bloqueia repetidas', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const preview = (await run(c, 'naturezas', 'Descrição\nBoleto\ncarteira\nBOLETO\n')).body;
  assert.strictEqual(preview.validos, 1);
  assert.strictEqual(preview.totalErros, 2); // "carteira" já existe; "BOLETO" repete no arquivo
  assert.strictEqual((await run(c, 'centros', 'Nome\nObra 3\nObra 4', true)).body.importados, 2);
  assert.ok((await c('GET', '/api/centros')).body.some((x) => x.nome === 'OBRA 3'));
  await close();
});

test('títulos: resolve fornecedor/natureza/centro por nome ou código, aceita pagos e rateio', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const csv = [
    'Fornecedor;Documento;Vencimento;Valor;Histórico;Natureza;Centro de custo 1;Valor centro 1;Centro de custo 2;Valor centro 2;Data pagamento;Valor pago;Juros',
    'forn x;NF1;10/01/2030;1.000,00;Compra;carteira;obra 1;;;;;;',
    '1;NF2;15/01/2030;500,00;Serviço;1;OBRA 1;200,00;OBRA 2;300,00;16/01/2030;505,00;5,00',
    'Fornecedor inexistente;NF3;10/01/2030;10,00;X;CARTEIRA;OBRA 1;;;;;;',
    'FORN X;NF4;10/01/2030;100,00;Rateio quebrado;CARTEIRA;OBRA 1;40,00;OBRA 2;40,00;;;',
  ].join('\n');

  const preview = (await run(c, 'titulos', csv)).body;
  assert.strictEqual(preview.validos, 2);
  assert.deepStrictEqual(preview.erros.map((e) => e.linha), [4, 5]);
  assert.match(preview.erros[0].mensagem, /Fornecedor "Fornecedor inexistente" não encontrado/);
  assert.match(preview.erros[1].mensagem, /soma do rateio/);

  const valid = csv.split('\n').filter((_, i) => i < 3).join('\n');
  assert.strictEqual((await run(c, 'titulos', valid, true)).body.importados, 2);
  const titulos = (await c('GET', '/api/titulos?status=')).body;
  assert.strictEqual(titulos.length, 2);
  const nf2 = titulos.find((t) => t.docum === 'NF2');
  assert.strictEqual(nf2.baixa.receb, 505);
  assert.strictEqual(nf2.baixa.juros, 5);
  assert.deepStrictEqual(nf2.rateio, [{ cc: 1, valor: 200 }, { cc: 2, valor: 300 }]);
  assert.strictEqual(titulos.find((t) => t.docum === 'NF1').rateio[0].valor, 1000);

  const again = (await run(c, 'titulos', valid)).body;
  assert.strictEqual(again.validos, 0);
  assert.match(again.erros[0].mensagem, /já cadastrado/);
  await close();
});

test('arquivo sem coluna obrigatória, vazio ou de tela desconhecida é recusado; nível Consulta não importa', async () => {
  const { client, close } = await createTestApp();
  const c = await client('ADM', 'segredo1');
  const missing = await run(c, 'fornecedores', 'Cidade\nBH');
  assert.strictEqual(missing.status, 400);
  assert.match(missing.body.error, /Coluna obrigatória ausente.*Nome/);
  assert.strictEqual((await run(c, 'fornecedores', 'Nome')).status, 400);
  assert.strictEqual((await run(c, 'usuarios', 'Nome\nX')).status, 404);

  const consulta = await client('OPER', 'segredo2');
  assert.strictEqual((await run(consulta, 'naturezas', 'Descrição\nX', true)).status, 403);
  assert.strictEqual((await consulta('GET', '/api/importar/naturezas/modelo')).status, 200);
  await close();
});
