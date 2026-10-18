'use strict';
const ValidationError = require('../../domain/errors/ValidationError');
const { normalizeCnpj } = require('../../domain/cnpj');
const { toCents, formatMoney } = require('../../domain/money');
const { key, parseMoney, parseDate, isBlank } = require('./importHelpers');

const CENTER_SLOTS = [1, 2, 3, 4];

const COLUMNS = [
  { header: 'Fornecedor', example: 'Código, CNPJ ou nome exato do fornecedor', required: true },
  { header: 'Documento', example: 'NF1234', required: true, aliases: ['Nº título', 'Nº documento'] },
  { header: 'Vencimento', example: '31/12/2026', required: true },
  { header: 'Emissão', example: '01/12/2026' },
  { header: 'Valor', example: '1.234,56', required: true },
  { header: 'Histórico', example: 'COMPRA DE MATERIAL', required: true },
  { header: 'Natureza', example: 'Código ou nome exato da natureza', required: true },
  { header: 'Local', example: 'BOLETO' },
  { header: 'Nota fiscal', example: '1234', aliases: ['NF'] },
  ...CENTER_SLOTS.flatMap((n) => [
    { header: `Centro de custo ${n}`, example: n === 1 ? 'Código ou nome exato do centro' : '', required: n === 1 },
    { header: `Valor centro ${n}`, example: '' },
  ]),
  { header: 'Data pagamento', example: '', aliases: ['Pagamento'] },
  { header: 'Valor pago', example: '' },
  { header: 'Juros', example: '' },
  { header: 'Desconto', example: '' },
  { header: 'Banco', example: '' },
  { header: 'Nº cheque', example: '', aliases: ['Cheque'] },
  { header: 'Valor do cheque', example: '' },
];

/**
 * Importa títulos (inclusive já pagos). Fornecedor, natureza e centros são resolvidos por código ou nome
 * (fornecedor também por CNPJ/CPF); as regras de negócio são as mesmas da inclusão manual.
 */
class TituloImporter {
  /**
   * @param {object} deps
   * @param {import('../../infrastructure/repositories/TituloRepository')} deps.titulos
   * @param {import('../../infrastructure/repositories/FornecedorRepository')} deps.fornecedores
   * @param {import('../../infrastructure/repositories/NaturezaRepository')} deps.naturezas
   * @param {import('../../infrastructure/repositories/CentroRepository')} deps.centros
   * @param {import('../../domain/validation/TituloValidator')} deps.tituloValidator
   * @param {import('../../domain/validation/BaixaValidator')} deps.baixaValidator
   */
  constructor({ titulos, fornecedores, naturezas, centros, tituloValidator, baixaValidator }) {
    this.entity = 'titulos';
    this.label = 'Títulos';
    this.auditEntity = 'titulo';
    this.columns = COLUMNS;
    Object.assign(this, { titulos, fornecedores, naturezas, centros, tituloValidator, baixaValidator });
  }

  begin() {
    const byName = (list) => new Map(list.map((r) => [key(r.nome), r.id]));
    const suppliers = this.fornecedores.findAll();
    return {
      fornecedorIds: new Set(suppliers.map((f) => f.id)),
      fornecedorNames: byName(suppliers),
      fornecedorDocs: new Map(suppliers.filter((f) => f.cgc).map((f) => [normalizeCnpj(f.cgc), f.id])),
      naturezaIds: new Set(this.naturezas.findAll().map((n) => n.id)),
      naturezaNames: byName(this.naturezas.findAll()),
      centroIds: new Set(this.centros.findAll().map((c) => c.id)),
      centroNames: byName(this.centros.findAll()),
      seen: new Set(this.titulos.search({}).map((t) => TituloImporter.#signature(t))),
    };
  }

  parse(row, context) {
    const valor = parseMoney(row.Valor, 'Valor');
    if (valor === null) throw new ValidationError('Valor é obrigatório');
    const dtvec = parseDate(row.Vencimento, 'Vencimento');
    const body = {
      codig: this.#resolve(row.Fornecedor, 'Fornecedor', context.fornecedorIds, context.fornecedorNames, context.fornecedorDocs),
      docum: row.Documento,
      histo: row['Histórico'],
      dtvec,
      dtemi: parseDate(row['Emissão'], 'Emissão') || dtvec,
      valor,
      local: row.Local,
      notaf: row['Nota fiscal'],
      natur: this.#resolve(row.Natureza, 'Natureza', context.naturezaIds, context.naturezaNames),
      rateio: this.#rateio(row, valor, context),
    };
    const titulo = this.tituloValidator.validate(body);
    const baixa = this.#baixa(row, titulo);

    const signature = TituloImporter.#signature(titulo);
    if (context.seen.has(signature)) throw new ValidationError(`Título ${titulo.docum} já cadastrado (mesmo fornecedor, documento, vencimento e valor)`);
    context.seen.add(signature);

    return {
      record: { ...titulo, baixa },
      summary: `${titulo.docum} · ${row.Fornecedor} · ${dtvec.split('-').reverse().join('/')} · ${formatMoney(titulo.valor)}${baixa ? ' · pago' : ''}`,
    };
  }

  commit(records) {
    return records.map((record) => this.titulos.create(record));
  }

  /** Código numérico existente, ou nome (e CNPJ/CPF para fornecedor) exato, sem diferenciar acentos/maiúsculas. */
  #resolve(raw, field, ids, names, docs) {
    if (isBlank(raw)) throw new ValidationError(`${field} é obrigatório`);
    const text = String(raw).trim();
    if (/^\d+$/.test(text) && ids.has(Number(text))) return Number(text);
    const byDoc = docs?.get(normalizeCnpj(text));
    if (byDoc) return byDoc;
    const byName = names.get(key(text));
    if (byName) return byName;
    throw new ValidationError(`${field} "${text}" não encontrado(a) nos cadastros`);
  }

  #rateio(row, total, context) {
    const itens = [];
    for (const n of CENTER_SLOTS) {
      const ref = row[`Centro de custo ${n}`];
      const valor = parseMoney(row[`Valor centro ${n}`], `Valor centro ${n}`);
      if (isBlank(ref)) {
        if (valor !== null) throw new ValidationError(`Valor centro ${n} informado sem o Centro de custo ${n}`);
      } else itens.push({ cc: this.#resolve(ref, `Centro de custo ${n}`, context.centroIds, context.centroNames), valor });
    }
    if (!itens.length) throw new ValidationError('Informe ao menos o Centro de custo 1');
    if (itens.length === 1 && itens[0].valor === null) itens[0].valor = total;
    if (itens.some((i) => i.valor === null)) throw new ValidationError('Informe o valor de cada centro de custo quando houver mais de um');
    return itens;
  }

  #baixa(row, titulo) {
    const dtpag = parseDate(row['Data pagamento'], 'Data pagamento');
    if (!dtpag) return null;
    const receb = parseMoney(row['Valor pago'], 'Valor pago') ?? titulo.valor;
    return this.baixaValidator.validate({
      dtpag,
      receb,
      juros: parseMoney(row.Juros, 'Juros') ?? 0,
      desco: parseMoney(row.Desconto, 'Desconto') ?? 0,
      banco: row.Banco,
      noche: row['Nº cheque'],
      vrche: parseMoney(row['Valor do cheque'], 'Valor do cheque') ?? receb,
    }, titulo);
  }

  static #signature(t) {
    return `${t.codig}|${String(t.docum).toUpperCase()}|${t.dtvec}|${toCents(t.valor)}`;
  }
}

module.exports = TituloImporter;
