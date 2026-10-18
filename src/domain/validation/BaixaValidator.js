'use strict';
const ValidationError = require('../errors/ValidationError');
const { isPlausibleDate } = require('../dates');
const { toCents, fromCents } = require('../money');

/** Regras da baixa (MVLER1): pago - juros + desconto = valor do título; cheque >= valor pago. */
class BaixaValidator {
  validate(body, titulo) {
    const baixa = {
      dtpag: body.dtpag,
      receb: fromCents(toCents(body.receb)),
      juros: fromCents(toCents(body.juros)),
      desco: fromCents(toCents(body.desco)),
      noche: Number(body.noche) || 0,
      banco: String(body.banco || '').trim().toUpperCase().slice(0, 21),
      vrche: fromCents(toCents(body.vrche)),
    };
    if (!isPlausibleDate(baixa.dtpag)) throw new ValidationError('Data de pagamento inválida');
    const liquido = toCents(baixa.receb) - toCents(baixa.juros) + toCents(baixa.desco);
    if (liquido !== toCents(titulo.valor)) {
      throw new ValidationError('Recebido - juros + desconto deve ser igual ao valor do título');
    }
    if (baixa.vrche < baixa.receb) throw new ValidationError('Valor do cheque não pode ser menor que o valor pago');
    return baixa;
  }
}

module.exports = BaixaValidator;
