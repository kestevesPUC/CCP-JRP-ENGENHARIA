'use strict';
const ValidationError = require('../errors/ValidationError');
const { isPlausibleDate } = require('../dates');
const { toCents, fromCents } = require('../money');

const MAX_CENTROS = 4;

/**
 * Valida e normaliza um título (regras do MVLER original): documento, histórico, valor e datas
 * obrigatórios; fornecedor/natureza existentes; 1 a 4 centros de custo distintos cujo rateio soma o valor.
 */
class TituloValidator {
  /** @param {{fornecedores:{exists(id):boolean}, naturezas:{exists(id):boolean}, centros:{exists(id):boolean}}} lookups */
  constructor({ fornecedores, naturezas, centros }) {
    this.fornecedores = fornecedores;
    this.naturezas = naturezas;
    this.centros = centros;
  }

  validate(body) {
    const titulo = {
      codig: Number(body.codig),
      docum: String(body.docum || '').trim().toUpperCase().slice(0, 8),
      histo: String(body.histo || '').trim().toUpperCase().slice(0, 52),
      dtvec: body.dtvec,
      dtemi: body.dtemi || body.dtvec,
      valor: fromCents(toCents(body.valor)),
      local: String(body.local || '').trim().toUpperCase().slice(0, 20),
      notaf: String(body.notaf || '').replace(/\D/g, '').slice(0, 6),
      natur: Number(body.natur),
    };
    this.#validateBasics(titulo);
    titulo.rateio = this.#validateRateio(body.rateio, titulo.valor);
    return titulo;
  }

  #validateBasics(t) {
    if (!this.fornecedores.exists(t.codig)) throw new ValidationError('Fornecedor não cadastrado');
    if (!t.docum) throw new ValidationError('Informe o nº do documento');
    if (!t.histo) throw new ValidationError('Informe o histórico');
    if (!(t.valor > 0)) throw new ValidationError('Informe o valor do título');
    if (!isPlausibleDate(t.dtvec)) throw new ValidationError('Data de vencimento inválida');
    if (!isPlausibleDate(t.dtemi)) throw new ValidationError('Data de emissão inválida');
    if (!this.naturezas.exists(t.natur)) throw new ValidationError('Natureza de pagamento não cadastrada');
  }

  #validateRateio(input, valorTitulo) {
    const itens = (Array.isArray(input) ? input : []).filter((r) => Number(r.cc));
    if (itens.length < 1) throw new ValidationError('Informe ao menos um centro de custo');
    if (itens.length > MAX_CENTROS) throw new ValidationError(`Máximo de ${MAX_CENTROS} centros de custo`);

    const vistos = new Set();
    let soma = 0;
    const rateio = itens.map((item) => {
      const cc = Number(item.cc);
      if (vistos.has(cc)) throw new ValidationError('Centro de custo repetido no rateio');
      vistos.add(cc);
      if (!this.centros.exists(cc)) throw new ValidationError(`Centro de custo ${cc} não cadastrado`);
      const cents = toCents(item.valor);
      if (cents <= 0) throw new ValidationError('Valor do rateio deve ser maior que zero');
      soma += cents;
      return { cc, valor: fromCents(cents) };
    });
    if (soma !== toCents(valorTitulo)) throw new ValidationError('A soma do rateio deve ser igual ao valor do título');
    return rateio;
  }
}

module.exports = TituloValidator;
