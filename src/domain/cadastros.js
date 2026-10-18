'use strict';
// Definição dos cadastros simples: campo -> tamanho máximo (herdado do layout dos .DBF).

const FORNECEDOR_FIELDS = {
  nome: 52, pess: 1, ende: 40, bair: 15, cida: 19, esta: 2, cep: 9, fone: 15, fax: 15, cgc: 18, insc: 16, con1: 25, con2: 25, nasc: 10,
};
const FORNECEDOR_DATE_FIELDS = ['nasc'];
const NATUREZA_FIELDS = { nome: 25 };
const CENTRO_FIELDS = { nome: 25 };

module.exports = { FORNECEDOR_DATE_FIELDS, FORNECEDOR_FIELDS, NATUREZA_FIELDS, CENTRO_FIELDS };
