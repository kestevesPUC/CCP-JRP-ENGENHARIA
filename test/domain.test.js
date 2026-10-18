'use strict';
const test = require('node:test');
const assert = require('node:assert');
const TituloValidator = require('../src/domain/validation/TituloValidator');
const BaixaValidator = require('../src/domain/validation/BaixaValidator');
const FieldSanitizer = require('../src/domain/validation/FieldSanitizer');
const TituloPolicy = require('../src/domain/policies/TituloPolicy');
const ValidationError = require('../src/domain/errors/ValidationError');
const ForbiddenError = require('../src/domain/errors/ForbiddenError');
const PasswordHasher = require('../src/infrastructure/security/PasswordHasher');
const LoginThrottle = require('../src/infrastructure/security/LoginThrottle');
const SessionStore = require('../src/infrastructure/security/SessionStore');

const always = { exists: () => true };
const validator = () => new TituloValidator({ fornecedores: always, naturezas: always, centros: always });
const base = { codig: 1, docum: 'a1', histo: 'x', dtvec: '2030-01-01', valor: 10, natur: 1, rateio: [{ cc: 1, valor: 10 }] };

test('TituloValidator normaliza texto e exige datas plausíveis (>= 1990)', () => {
  const t = validator().validate({ ...base, docum: ' ab1 ' });
  assert.strictEqual(t.docum, 'AB1');
  assert.strictEqual(t.dtemi, '2030-01-01');
  assert.throws(() => validator().validate({ ...base, dtvec: '1980-01-01' }), ValidationError);
});

test('TituloValidator aceita no máximo 4 centros de custo', () => {
  const rateio = [1, 2, 3, 4, 5].map((cc) => ({ cc, valor: 2 }));
  assert.throws(() => validator().validate({ ...base, rateio }), /Máximo de 4/);
});

test('TituloValidator calcula soma do rateio em centavos (sem erro de ponto flutuante)', () => {
  const t = validator().validate({ ...base, valor: 0.3, rateio: [{ cc: 1, valor: 0.1 }, { cc: 2, valor: 0.2 }] });
  assert.strictEqual(t.valor, 0.3);
});

test('BaixaValidator: cheque não pode ser menor que o valor pago', () => {
  const v = new BaixaValidator();
  assert.throws(() => v.validate({ dtpag: '2030-01-01', receb: 10, juros: 0, desco: 0, vrche: 5 }, { valor: 10 }), /cheque/);
  assert.strictEqual(v.validate({ dtpag: '2030-01-01', receb: 10, juros: 0, desco: 0, vrche: 10 }, { valor: 10 }).receb, 10);
});

test('FieldSanitizer limita tamanho e exige o campo obrigatório', () => {
  const s = new FieldSanitizer({ nome: 5 });
  assert.strictEqual(s.sanitize({ nome: ' abcdefgh ' }).nome, 'ABCDE');
  assert.throws(() => s.sanitize({ nome: '  ' }), ValidationError);
});

test('TituloPolicy: nível diferente de A não exclui título baixado', () => {
  const policy = new TituloPolicy();
  assert.throws(() => policy.assertCanDelete({ nivel: 'B' }, { baixa: {} }), ForbiddenError);
  assert.doesNotThrow(() => policy.assertCanDelete({ nivel: 'B' }, { baixa: null }));
  assert.doesNotThrow(() => policy.assertCanDelete({ nivel: 'A' }, { baixa: {} }));
});

test('PasswordHasher: hash com sal e verificação', () => {
  const h = new PasswordHasher();
  const a = h.hash('segredo');
  assert.notStrictEqual(a, h.hash('segredo'));
  assert.ok(h.verify('segredo', a));
  assert.ok(!h.verify('outra', a));
  assert.ok(!h.verify('x', ''));
});

test('LoginThrottle e SessionStore respeitam o relógio injetado', () => {
  let now = 0;
  const throttle = new LoginThrottle({ now: () => now });
  for (let i = 0; i < 3; i++) throttle.registerFailure('u');
  assert.ok(throttle.isBlocked('u'));
  now += 6 * 60 * 1000;
  assert.ok(!throttle.isBlocked('u'));

  const sessions = new SessionStore({ ttlMs: 1000, now: () => now });
  const token = sessions.create(7);
  assert.strictEqual(sessions.userIdFor(token), 7);
  now += 2000;
  assert.strictEqual(sessions.userIdFor(token), null);
});
