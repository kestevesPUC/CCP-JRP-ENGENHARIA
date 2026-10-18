'use strict';
const ValidationError = require('../errors/ValidationError');
const { isBirthDate } = require('../dates');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normaliza e valida os dados pessoais de um usuário: nome, e-mail, telefone e data de nascimento (validados no servidor). */
class PerfilSanitizer {
  /** @param {{nome?:string, email?:string, telefone?:string, nascimento?:string}} body @param {{nomeObrigatorio?:boolean}} [options] */
  sanitize(body, { nomeObrigatorio = true } = {}) {
    const nome = String(body.nome ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 80);
    const telefone = String(body.telefone ?? '').trim().slice(0, 15);
    const nascimento = String(body.nascimento ?? '').trim();
    if (nomeObrigatorio && !nome) throw new ValidationError('Nome é obrigatório');
    if (email && !EMAIL.test(email)) throw new ValidationError('E-mail inválido');
    if (telefone && ![10, 11].includes(telefone.replace(/\D/g, '').length)) throw new ValidationError('Telefone inválido: informe DDD e número');
    if (nascimento && !isBirthDate(nascimento)) throw new ValidationError('Data de nascimento inválida');
    return { nome, email, telefone, nascimento };
  }
}

module.exports = PerfilSanitizer;
