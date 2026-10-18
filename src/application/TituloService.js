'use strict';
const NotFoundError = require('../domain/errors/NotFoundError');
const ConflictError = require('../domain/errors/ConflictError');
const ValidationError = require('../domain/errors/ValidationError');
const { isPlausibleDate } = require('../domain/dates');
const { toCents, fromCents, formatMoney } = require('../domain/money');

const LIST_LIMIT = 1000;

/** Casos de uso de títulos: inclusão, alteração, exclusão, baixa, estorno e reprogramação (todos auditados). */
class TituloService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/repositories/TituloRepository')} deps.titulos
   * @param {import('../domain/validation/TituloValidator')} deps.tituloValidator
   * @param {import('../domain/validation/BaixaValidator')} deps.baixaValidator
   * @param {import('../domain/policies/TituloPolicy')} deps.policy
   * @param {import('./AuditTrail')} deps.audit
   */
  constructor({ titulos, tituloValidator, baixaValidator, policy, audit }) {
    this.titulos = titulos;
    this.tituloValidator = tituloValidator;
    this.baixaValidator = baixaValidator;
    this.policy = policy;
    this.audit = audit;
  }

  list(filters) {
    return this.titulos.search({ ...filters, limit: LIST_LIMIT });
  }

  create(actor, body) {
    const criado = this.titulos.create(this.tituloValidator.validate(body));
    this.#log(actor, 'criar', criado, `Título ${criado.docum} incluído`, null, criado);
    return criado;
  }

  update(actor, id, body) {
    const antes = this.#require(id);
    if (antes.baixa) throw new ConflictError('O título está baixado, não poderá ser alterado');
    const depois = this.titulos.update(id, this.tituloValidator.validate(body));
    this.#log(actor, 'alterar', depois, `Título ${depois.docum} alterado`, antes, depois);
    return depois;
  }

  remove(user, id) {
    const titulo = this.#require(id);
    this.policy.assertCanDelete(user, titulo);
    this.titulos.delete(id);
    this.#log(user, 'excluir', titulo, `Título ${titulo.docum} excluído`, titulo, null);
    return { ok: true };
  }

  baixar(actor, id, body) {
    const antes = this.#require(id);
    if (antes.baixa) throw new ConflictError('O título já está baixado');
    const depois = this.titulos.saveBaixa(id, this.baixaValidator.validate(body, antes));
    this.#log(actor, 'baixar', depois, `Título ${depois.docum} baixado (pago ${formatMoney(depois.baixa.receb)})`, antes, depois);
    return depois;
  }

  estornar(user, id) {
    this.policy.assertCanReverseBaixa(user);
    const antes = this.#require(id);
    const depois = this.titulos.clearBaixa(id);
    this.#log(user, 'estornar', depois, `Baixa do título ${depois.docum} estornada`, antes, depois);
    return depois;
  }

  reprogramar(actor, id, body) {
    const antes = this.#require(id);
    if (antes.baixa) throw new ConflictError('O título está baixado, não poderá ser reprogramado');
    if (!isPlausibleDate(body.dtrep)) throw new ValidationError('Data inválida');
    const valre = body.valre ? fromCents(toCents(body.valre)) : antes.valor;
    const depois = this.titulos.saveReprogramacao(id, body.dtrep, valre);
    this.#log(actor, 'reprogramar', depois, `Vencimento do título ${depois.docum} reprogramado para ${depois.dtrep.split('-').reverse().join('/')}`, antes, depois);
    return depois;
  }

  #log(actor, acao, titulo, descricao, antes, depois) {
    this.audit.record({
      actor, acao, entidade: 'titulo', entidadeId: titulo.id, descricao: `${descricao} — ${titulo.fornecedor}, ${formatMoney(titulo.valor)}`, antes, depois,
    });
  }

  #require(id) {
    const titulo = this.titulos.findById(id);
    if (!titulo) throw new NotFoundError('Título não encontrado');
    return titulo;
  }
}

module.exports = TituloService;
