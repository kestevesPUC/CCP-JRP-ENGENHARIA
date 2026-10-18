'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isValidCnpj, normalizeCnpj } = require('../src/domain/cnpj');
const CnpjLookupService = require('../src/application/CnpjLookupService');
const ReceitaWsGateway = require('../src/infrastructure/http/ReceitaWsGateway');
const NotFoundError = require('../src/domain/errors/NotFoundError');
const ExternalServiceError = require('../src/domain/errors/ExternalServiceError');
const { createTestApp } = require('./helpers/createTestApp');

const RECEITA = {
  status: 'OK', situacao: 'ATIVA', nome: 'EMPRESA EXEMPLO LTDA', logradouro: 'RUA DAS FLORES', numero: '123', bairro: 'CENTRO',
  municipio: 'BELO HORIZONTE', uf: 'MG', cep: '30.130-000', telefone: '(31) 3333-4444 / (31) 9999-8888',
};

const jsonResponse = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('valida CNPJ numérico e alfanumérico (dígitos verificadores)', () => {
  assert.ok(isValidCnpj('11.222.333/0001-81'));
  assert.ok(isValidCnpj('12.ABC.345/01DE-35'));
  assert.ok(!isValidCnpj('11.222.333/0001-82'));
  assert.ok(!isValidCnpj('00.000.000/0000-00'));
  assert.ok(!isValidCnpj('123'));
  assert.strictEqual(normalizeCnpj('11.222.333/0001-81'), '11222333000181');
});

test('CnpjLookupService converte a resposta da Receita para o cadastro de fornecedor', async () => {
  const service = new CnpjLookupService({ gateway: { fetchCnpj: async () => RECEITA } });
  const { fornecedor, situacao } = await service.lookup('11.222.333/0001-81');
  assert.strictEqual(situacao, 'ATIVA');
  assert.deepStrictEqual(fornecedor, {
    cgc: '11.222.333/0001-81', pess: 'J', nome: 'EMPRESA EXEMPLO LTDA', ende: 'RUA DAS FLORES, 123', bair: 'CENTRO',
    cida: 'BELO HORIZONTE', esta: 'MG', cep: '30130-000', fone: '(31) 3333-4444',
  });
});

test('CnpjLookupService rejeita CNPJ inválido sem chamar a Receita', async () => {
  let calls = 0;
  const service = new CnpjLookupService({ gateway: { fetchCnpj: async () => { calls += 1; return RECEITA; } } });
  await assert.rejects(() => service.lookup('11.222.333/0001-82'), /CNPJ inválido/);
  assert.strictEqual(calls, 0);
});

test('ReceitaWsGateway: sucesso, não encontrado, limite de consultas e indisponibilidade', async () => {
  const gateway = (fetchImpl) => new ReceitaWsGateway({ fetchImpl, baseUrl: 'https://exemplo.test/v1/cnpj' });
  let requested;
  const ok = gateway(async (url) => { requested = url; return jsonResponse(200, RECEITA); });
  assert.strictEqual((await ok.fetchCnpj('11222333000181')).nome, 'EMPRESA EXEMPLO LTDA');
  assert.strictEqual(requested, 'https://exemplo.test/v1/cnpj/11222333000181');

  await assert.rejects(() => gateway(async () => jsonResponse(200, { status: 'ERROR', message: 'CNPJ inválido' })).fetchCnpj('1'), NotFoundError);
  await assert.rejects(() => gateway(async () => jsonResponse(429, { message: 'Too many requests' })).fetchCnpj('1'), (e) => e instanceof ExternalServiceError && e.status === 429);
  await assert.rejects(() => gateway(async () => { throw new Error('rede'); }).fetchCnpj('1'), (e) => e instanceof ExternalServiceError && e.status === 502);
});

test('GET /api/cnpj/:cnpj usa o gateway injetado e traduz erros para o frontend', async () => {
  const gateway = {
    fetchCnpj: async (cnpj) => {
      if (cnpj === '11222333000181') return RECEITA;
      throw new NotFoundError('CNPJ não encontrado na Receita Federal.');
    },
  };
  const { client, close } = await createTestApp({ cnpjGateway: gateway });
  assert.strictEqual((await (await client())('GET', '/api/cnpj/11222333000181')).status, 401);
  const c = await client('ADM', 'segredo1');
  const found = await c('GET', '/api/cnpj/11.222.333%2F0001-81');
  assert.strictEqual(found.status, 200);
  assert.strictEqual(found.body.fornecedor.nome, 'EMPRESA EXEMPLO LTDA');
  assert.strictEqual((await c('GET', '/api/cnpj/123')).status, 400);
  const missing = await c('GET', '/api/cnpj/12ABC34501DE35');
  assert.strictEqual(missing.status, 404);
  assert.match(missing.body.error, /não encontrado/);
  await close();
});
