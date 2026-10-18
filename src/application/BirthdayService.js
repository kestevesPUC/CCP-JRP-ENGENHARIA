'use strict';
const { nextBirthday } = require('../domain/birthdays');
const { today: todayIso } = require('../domain/dates');

const WEEK_DAYS = 7;

/** Lembrete de aniversários (usuários e fornecedores) que acontecem hoje ou nos próximos dias; usado para alertar os administradores. */
class BirthdayService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/repositories/UsuarioRepository')} deps.usuarios
   * @param {import('../infrastructure/repositories/FornecedorRepository')} deps.fornecedores
   * @param {() => string} [deps.clock] data de hoje (ISO), injetável em testes
   */
  constructor({ usuarios, fornecedores, clock = todayIso }) {
    this.usuarios = usuarios;
    this.fornecedores = fornecedores;
    this.clock = clock;
  }

  /** @param {number} [days] janela a partir de hoje (padrão: 7 dias, "a semana") */
  proximos(days = WEEK_DAYS) {
    const today = this.clock();
    const pessoas = [
      ...this.usuarios.findAll().filter((u) => u.nascimento).map((u) => ({ tipo: 'usuario', nome: u.nome || u.usuario, nascimento: u.nascimento })),
      ...this.fornecedores.findAll().filter((f) => f.nasc).map((f) => ({ tipo: 'fornecedor', nome: f.nome, nascimento: f.nasc })),
    ];
    const lista = pessoas
      .map((p) => ({ tipo: p.tipo, nome: p.nome, ...nextBirthday(p.nascimento, today) }))
      .filter((p) => p.dias <= days)
      .sort((a, b) => a.dias - b.dias || a.nome.localeCompare(b.nome));
    return { hoje: today, dias: days, aniversarios: lista };
  }
}

module.exports = BirthdayService;
