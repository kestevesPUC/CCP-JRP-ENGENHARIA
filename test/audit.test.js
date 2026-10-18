'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createTestApp, novoTitulo } = require('./helpers/createTestApp');

const list = async (c, qs = '') => (await c('GET', `/api/auditoria${qs}`)).body;

test('login, falha de login e logout são registrados', async () => {
  const { client, close } = await createTestApp();
  const anon = await client();
  await anon('POST', '/api/login', { usuario: 'ADM', senha: 'errada' });
  const admin = await client('ADM', 'segredo1');
  await admin('POST', '/api/logout');
  const admin2 = await client('ADM', 'segredo1');
  const acoes = (await list(admin2)).map((e) => e.acao);
  assert.ok(acoes.includes('login_falha') && acoes.includes('login') && acoes.includes('logout'));
  const falha = (await list(admin2, '?acao=login_falha'))[0];
  assert.strictEqual(falha.usuario, 'ADM');
  assert.strictEqual(falha.usuarioId, null);
  await close();
});

test('criar, alterar, baixar, estornar e excluir título geram registros com antes/depois e autor', async () => {
  const { client, close } = await createTestApp();
  const admin = await client('ADM', 'segredo1');
  const { body: t } = await admin('POST', '/api/titulos', novoTitulo());
  await admin('PUT', `/api/titulos/${t.id}`, novoTitulo({ histo: 'alterado', valor: 120, rateio: [{ cc: 1, valor: 120 }] }));
  await admin('POST', `/api/titulos/${t.id}/baixa`, { dtpag: '2030-01-10', receb: 120, juros: 0, desco: 0, vrche: 120 });
  await admin('POST', `/api/titulos/${t.id}/estorno`, {});
  await admin('DELETE', `/api/titulos/${t.id}`);

  const entries = await list(admin, `?entidade=titulo&entidadeId=${t.id}`);
  assert.deepStrictEqual(entries.map((e) => e.acao).reverse(), ['criar', 'alterar', 'baixar', 'estornar', 'excluir']);
  assert.ok(entries.every((e) => e.usuario === 'ADM' && e.usuarioId === 1));

  const alterar = (await admin('GET', `/api/auditoria/${entries.find((e) => e.acao === 'alterar').id}`)).body;
  assert.strictEqual(alterar.antes.histo, 'TESTE');
  assert.strictEqual(alterar.depois.histo, 'ALTERADO');
  assert.strictEqual(alterar.depois.valor, 120);
  const criar = (await admin('GET', `/api/auditoria/${entries.find((e) => e.acao === 'criar').id}`)).body;
  assert.strictEqual(criar.antes, null);
  await close();
});

test('cadastros, usuários, foto e senha também são auditados, sem expor senhas', async () => {
  const { client, close } = await createTestApp();
  const admin = await client('ADM', 'segredo1');
  const { body: forn } = await admin('POST', '/api/fornecedores', { nome: 'Novo Forn' });
  await admin('PUT', `/api/fornecedores/${forn.id}`, { nome: 'Novo Forn 2' });
  await admin('DELETE', `/api/fornecedores/${forn.id}`);
  await admin('POST', '/api/usuarios', { usuario: 'joao', nivel: 'B', senha: 'senhasecreta1' });
  await admin('POST', '/api/me/senha', { atual: 'segredo1', nova: 'novasecreta2' });

  const all = await list(admin);
  const acoesFornecedor = all.filter((e) => e.entidade === 'fornecedor' && e.entidadeId === forn.id).map((e) => e.acao).reverse();
  assert.deepStrictEqual(acoesFornecedor, ['criar', 'alterar', 'excluir']);
  assert.ok(all.some((e) => e.acao === 'criar' && e.entidade === 'usuario' && /JOAO/.test(e.descricao)));
  assert.ok(all.some((e) => e.acao === 'senha'));

  const raw = JSON.stringify(await Promise.all(all.map(async (e) => (await admin('GET', `/api/auditoria/${e.id}`)).body)));
  assert.ok(!/senhasecreta1|novasecreta2|segredo1|senha_hash|"senha":/.test(raw), 'a auditoria não pode conter senhas nem hashes');
  await close();
});

test('a auditoria é imutável no banco (UPDATE e DELETE são bloqueados)', async () => {
  const { app, client, close } = await createTestApp();
  await client('ADM', 'segredo1');
  assert.throws(() => app.db.prepare("UPDATE auditoria SET descricao = 'x'").run(), /não podem ser alterados/);
  assert.throws(() => app.db.prepare('DELETE FROM auditoria').run(), /não podem ser excluídos/);
  await close();
});

test('somente nível A consulta e exporta a auditoria; filtros e busca funcionam', async () => {
  const { client, close } = await createTestApp();
  const oper = await client('OPER', 'segredo2');
  const admin = await client('ADM', 'segredo1');
  assert.strictEqual((await oper('GET', '/api/auditoria')).status, 403);
  assert.strictEqual((await oper('GET', '/api/exportar/auditoria')).status, 403);

  await admin('POST', '/api/titulos', novoTitulo({ docum: 'ZZZ9' }));
  assert.strictEqual((await list(admin, '?q=ZZZ9')).length, 1);
  assert.ok((await list(admin, '?usuario=OPER')).every((e) => e.usuario === 'OPER'));
  const hoje = new Date().toISOString().slice(0, 10);
  assert.ok((await list(admin, `?de=${hoje}&ate=${hoje}`)).length >= 1);
  assert.strictEqual((await list(admin, '?de=2000-01-01&ate=2000-01-02')).length, 0);

  const opcoes = (await admin('GET', '/api/auditoria/opcoes')).body;
  assert.ok(opcoes.usuarios.includes('ADM') && opcoes.acoes.includes('criar') && opcoes.entidades.includes('titulo'));
  const csv = await admin('GET', '/api/exportar/auditoria');
  assert.strictEqual(csv.status, 200);
  assert.ok(csv.body.includes('ZZZ9'));
  await close();
});

test('backup e importação CSV ficam registrados', async () => {
  const { client, close } = await createTestApp();
  const admin = await client('ADM', 'segredo1');
  await admin('GET', '/api/backup');
  await admin('POST', '/api/importar/naturezas', { confirmar: true, csv: 'Descrição\nBOLETO\nPIX\n' });
  const acoes = (await list(admin)).map((e) => e.acao);
  assert.ok(acoes.includes('backup') && acoes.includes('importar'));
  await close();
});
