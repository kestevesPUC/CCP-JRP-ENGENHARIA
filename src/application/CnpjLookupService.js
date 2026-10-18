'use strict';
const ValidationError = require('../domain/errors/ValidationError');
const { normalizeCnpj, isValidCnpj } = require('../domain/cnpj');
const { FORNECEDOR_FIELDS } = require('../domain/cadastros');

const clip = (text, field) => String(text || '').trim().slice(0, FORNECEDOR_FIELDS[field]);

/** Busca dados de um CNPJ no gateway e os converte para o layout do cadastro de fornecedores. */
class CnpjLookupService {
  /** @param {{gateway: {fetchCnpj(cnpj:string): Promise<object>}}} deps */
  constructor({ gateway }) {
    this.gateway = gateway;
  }

  /** @returns {Promise<{fornecedor: object, situacao: string}>} */
  async lookup(rawCnpj) {
    const cnpj = normalizeCnpj(rawCnpj);
    if (!isValidCnpj(cnpj)) throw new ValidationError('CNPJ inválido. Confira os dígitos informados.');
    const data = await this.gateway.fetchCnpj(cnpj);
    return { fornecedor: CnpjLookupService.toFornecedor(cnpj, data), situacao: String(data.situacao || '').trim() };
  }

  static toFornecedor(cnpj, data) {
    const street = [data.logradouro, data.numero].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
    const cep = String(data.cep || '').replace(/\D/g, '');
    return {
      cgc: `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`,
      pess: 'J',
      nome: clip(data.nome, 'nome'),
      ende: clip(street, 'ende'),
      bair: clip(data.bairro, 'bair'),
      cida: clip(data.municipio, 'cida'),
      esta: clip(data.uf, 'esta'),
      cep: cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : '',
      fone: clip(String(data.telefone || '').split('/')[0], 'fone'),
    };
  }
}

module.exports = CnpjLookupService;
