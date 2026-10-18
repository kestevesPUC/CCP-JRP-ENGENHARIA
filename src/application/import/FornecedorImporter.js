'use strict';
const ValidationError = require('../../domain/errors/ValidationError');
const FieldSanitizer = require('../../domain/validation/FieldSanitizer');
const { FORNECEDOR_FIELDS } = require('../../domain/cadastros');
const { normalizeCnpj, isValidCnpj, formatDocument } = require('../../domain/cnpj');

const COLUMNS = [
  { header: 'CNPJ/CPF', example: '11.222.333/0001-81', aliases: ['CNPJ', 'CPF', 'Documento'] },
  { header: 'Nome', example: 'EXEMPLO - APAGUE ESTA LINHA', required: true, aliases: ['Nome / Razão social', 'Razão social'] },
  { header: 'Pessoa (F/J)', example: 'J', aliases: ['Pessoa', 'Tipo'] },
  { header: 'Inscrição estadual', example: 'ISENTO', aliases: ['Insc. estadual', 'IE'] },
  { header: 'Endereço', example: 'RUA DAS FLORES, 123' },
  { header: 'Bairro', example: 'CENTRO' },
  { header: 'Cidade', example: 'BELO HORIZONTE' },
  { header: 'UF', example: 'MG' },
  { header: 'CEP', example: '30130-000' },
  { header: 'Telefone', example: '(31) 3333-4444', aliases: ['Fone'] },
  { header: 'Fax', example: '' },
  { header: 'Contato 1', example: 'MARIA' },
  { header: 'Contato 2', example: '' },
];
const FIELD_BY_HEADER = {
  'CNPJ/CPF': 'cgc', Nome: 'nome', 'Pessoa (F/J)': 'pess', 'Inscrição estadual': 'insc', Endereço: 'ende', Bairro: 'bair', Cidade: 'cida', UF: 'esta', CEP: 'cep',
  Telefone: 'fone', Fax: 'fax', 'Contato 1': 'con1', 'Contato 2': 'con2',
};

/** Importa fornecedores: valida CNPJ, deduz F/J pelo documento e rejeita documentos já cadastrados. */
class FornecedorImporter {
  /** @param {{repository: import('../../infrastructure/repositories/FornecedorRepository')}} deps */
  constructor({ repository }) {
    this.entity = 'fornecedores';
    this.label = 'Fornecedores';
    this.auditEntity = 'fornecedor';
    this.columns = COLUMNS;
    this.repository = repository;
    this.sanitizer = new FieldSanitizer(FORNECEDOR_FIELDS);
  }

  begin() {
    return { documents: new Set(this.repository.findAll().map((f) => normalizeCnpj(f.cgc)).filter(Boolean)) };
  }

  parse(row, context) {
    const body = Object.fromEntries(Object.entries(FIELD_BY_HEADER).map(([header, field]) => [field, row[header]]));
    const document = normalizeCnpj(body.cgc);

    if (document) {
      if (document.length === 14 && !isValidCnpj(document)) throw new ValidationError(`CNPJ inválido: ${body.cgc}`);
      if (![11, 14].includes(document.length)) throw new ValidationError(`CNPJ/CPF "${body.cgc}" deve ter 14 (CNPJ) ou 11 (CPF) caracteres`);
      if (context.documents.has(document)) throw new ValidationError(`CNPJ/CPF ${body.cgc} já cadastrado`);
      body.cgc = formatDocument(document);
    }
    const record = this.sanitizer.sanitize(body);
    if (!record.pess && document) record.pess = document.length === 14 ? 'J' : 'F';
    if (record.pess && !['F', 'J'].includes(record.pess)) throw new ValidationError('Pessoa deve ser F (física) ou J (jurídica)');
    if (document) context.documents.add(document);
    return { record, summary: `${record.nome}${record.cgc ? ` · ${record.cgc}` : ''}` };
  }

  commit(records) {
    return records.map((record) => this.repository.create(record));
  }
}

module.exports = FornecedorImporter;
