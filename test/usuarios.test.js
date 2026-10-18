'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createTestApp } = require('./helpers/createTestApp');
const { nextBirthday } = require('../src/domain/birthdays');
const PerfilSanitizer = require('../src/domain/validation/PerfilSanitizer');
const ValidationError = require('../src/domain/errors/ValidationError');

test('nextBirthday: hoje, próximo ano, 29/02 e idade que completa', () => {
  assert.deepStrictEqual(nextBirthday('1990-10-18', '2026-10-18'), { data: '2026-10-18', dias: 0, anos: 36 });
  assert.deepStrictEqual(nextBirthday('1990-10-17', '2026-10-18'), { data: '2027-10-17', dias: 364, anos: 37 });
  assert.strictEqual(nextBirthday('2000-02-29', '2027-02-20').data, '2027-02-28');
  assert.strictEqual(nextBirthday('2000-02-29', '2028-02-20').data, '2028-02-29');
  assert.strictEqual(nextBirthday('1990-01-03', '2026-12-30').dias, 4);
});

test('PerfilSanitizer valida nome, e-mail, telefone e nascimento', () => {
  const s = new PerfilSanitizer();
  assert.deepStrictEqual(s.sanitize({ nome: '  Ana   Souza ', email: 'ANA@Exemplo.com', telefone: '(31) 99999-9999', nascimento: '1990-05-20' }),
    { nome: 'Ana Souza', email: 'ana@exemplo.com', telefone: '(31) 99999-9999', nascimento: '1990-05-20' });
  assert.throws(() => s.sanitize({ nome: '' }), /Nome é obrigatório/);
  assert.throws(() => s.sanitize({ nome: 'A', email: 'sem-arroba' }), ValidationError);
  assert.throws(() => s.sanitize({ nome: 'A', telefone: '123' }), /Telefone inválido/);
  assert.throws(() => s.sanitize({ nome: 'A', nascimento: '2999-01-01' }), /nascimento inválida/);
});

test('administrador cadastra usuário com dados pessoais, edita, redefine a senha e exclui', async () => {
  const { client, close } = await createTestApp();
  const admin = await client('ADM', 'segredo1');

  assert.strictEqual((await admin('POST', '/api/usuarios', { usuario: 'ANA', nivel: 'B', senha: 'senha123', nome: '' })).status, 400);
  const created = await admin('POST', '/api/usuarios', {
    nome: 'Ana Souza', usuario: 'ana', nivel: 'B', senha: 'senha123', email: 'ana@exemplo.com', telefone: '(31) 99999-9999', nascimento: '1990-05-20',
  });
  assert.strictEqual(created.status, 200);
  assert.strictEqual(created.body.nome, 'Ana Souza');
  assert.strictEqual(created.body.nascimento, '1990-05-20');
  assert.ok(!('senha' in created.body));
  const id = created.body.id;

  const edited = await admin('PUT', `/api/usuarios/${id}`, { nome: 'Ana S. Lima', email: 'ana.lima@exemplo.com', telefone: '', nascimento: '1990-05-21' });
  assert.strictEqual(edited.body.nome, 'Ana S. Lima');
  assert.strictEqual(edited.body.nascimento, '1990-05-21');
  assert.strictEqual((await admin('PUT', `/api/usuarios/${id}`, { nome: 'Ana', email: 'x' })).status, 400);

  // Redefinição de senha: a antiga deixa de valer, a nova exige troca no primeiro acesso e a sessão aberta é encerrada.
  const ana = await client('ANA', 'senha123');
  assert.strictEqual((await ana('GET', '/api/me')).status, 200);
  assert.strictEqual((await admin('POST', `/api/usuarios/${id}/senha`, { senha: '123' })).status, 400);
  assert.strictEqual((await admin('POST', `/api/usuarios/${id}/senha`, { senha: 'nova-senha1' })).status, 200);
  assert.strictEqual((await ana('GET', '/api/me')).status, 401);
  const again = await client('ANA', 'nova-senha1');
  assert.strictEqual((await again('GET', '/api/me')).body.mustChange, true);
  await assert.rejects(() => client('ANA', 'senha123'));

  // Auditoria registra a redefinição sem expor senhas.
  const log = await admin('GET', '/api/auditoria');
  assert.ok(log.body.some((e) => e.acao === 'senha' && /redefiniu a senha de ANA/.test(e.descricao)));
  assert.ok(!JSON.stringify(log.body).includes('nova-senha1'));

  // Só o nível A administra usuários; excluir um usuário específico funciona e não permite excluir a si mesmo.
  const oper = await client('OPER', 'segredo2');
  assert.strictEqual((await oper('POST', `/api/usuarios/${id}/senha`, { senha: 'qualquer1' })).status, 403);
  assert.strictEqual((await oper('PUT', `/api/usuarios/${id}`, { nome: 'X' })).status, 403);
  assert.strictEqual((await admin('DELETE', `/api/usuarios/${id}`)).status, 200);
  assert.strictEqual((await admin('DELETE', '/api/usuarios/1')).status, 409);
  await close();
});

test('usuário atualiza os próprios dados em /api/me', async () => {
  const { client, close } = await createTestApp();
  const oper = await client('OPER', 'segredo2');
  const res = await oper('PUT', '/api/me', { nome: 'Operador Teste', email: 'op@exemplo.com', telefone: '(31) 3333-4444', nascimento: '1985-12-01' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await oper('GET', '/api/me')).body.nome, 'Operador Teste');
  await close();
});

test('aniversários da semana: alerta só para administradores, com usuários e fornecedores', async () => {
  const hoje = '2026-10-18';
  const { client, close } = await createTestApp({ clock: () => hoje });
  const admin = await client('ADM', 'segredo1');
  await admin('PUT', '/api/me', { nome: 'Administrador', nascimento: '1980-10-18' });
  await admin('POST', '/api/fornecedores', { nome: 'EMPRESA DA SEMANA', nasc: '2010-10-22' });
  await admin('POST', '/api/fornecedores', { nome: 'EMPRESA DO MES QUE VEM', nasc: '2010-11-30' });
  assert.strictEqual((await admin('POST', '/api/fornecedores', { nome: 'DATA RUIM', nasc: '31/12/2000' })).status, 400);

  const week = await admin('GET', '/api/aniversarios');
  assert.strictEqual(week.status, 200);
  assert.deepStrictEqual(week.body.aniversarios.map((a) => [a.tipo, a.nome, a.dias, a.anos]), [
    ['usuario', 'Administrador', 0, 46],
    ['fornecedor', 'EMPRESA DA SEMANA', 4, 16],
  ]);

  const oper = await client('OPER', 'segredo2');
  assert.strictEqual((await oper('GET', '/api/aniversarios')).status, 403);
  await close();
});
