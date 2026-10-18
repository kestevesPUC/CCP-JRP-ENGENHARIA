'use strict';
const assert = require('node:assert');
const { buildApplication } = require('../../src/compositionRoot');

/** Sobe a aplicação completa com SQLite em memória e um cliente HTTP com cookie de sessão. */
async function createTestApp({ cnpjGateway, clock } = {}) {
  const app = buildApplication({ dbFile: ':memory:', logger: { error() {} }, ...(cnpjGateway && { cnpjGateway }), ...(clock && { clock }) });
  const { fornecedores, naturezas, centros, usuarios } = app.repositories;

  fornecedores.create({ nome: 'FORN X' });
  naturezas.create({ nome: 'CARTEIRA' });
  centros.create({ nome: 'OBRA 1' });
  centros.create({ nome: 'OBRA 2' });
  usuarios.create({ usuario: 'ADM', nivel: 'A', senha: app.hasher.hash('segredo1'), mustChange: false });
  usuarios.create({ usuario: 'OPER', nivel: 'C', senha: app.hasher.hash('segredo2'), mustChange: false });

  const { port } = await app.httpServer.listen(0);
  app.httpServer.server.unref(); // um teste que falhe antes do close() não deve segurar o processo
  const base = `http://127.0.0.1:${port}`;

  async function client(usuario, senha) {
    let cookie = '';
    const call = async (method, url, body) => {
      const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const text = await res.text();
      const isJson = (res.headers.get('content-type') || '').includes('json');
      return { status: res.status, headers: res.headers, body: isJson && text ? JSON.parse(text) : text };
    };
    if (usuario) assert.strictEqual((await call('POST', '/api/login', { usuario, senha })).status, 200);
    return call;
  }

  const close = async () => {
    await app.httpServer.close();
    app.db.close();
  };
  return { app, client, close };
}

const novoTitulo = (overrides = {}) => ({
  codig: 1, docum: 'nf1', histo: 'teste', dtvec: '2030-01-10', dtemi: '2030-01-01', valor: 100, natur: 1, rateio: [{ cc: 1, valor: 100 }], ...overrides,
});

module.exports = { createTestApp, novoTitulo };
