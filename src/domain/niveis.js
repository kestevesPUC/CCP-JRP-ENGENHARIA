'use strict';
// Níveis de acesso dos usuários.
//  A - Administrador: tudo, inclusive usuários, backup, estorno e exclusão de títulos baixados.
//  B - Operador: inclui, altera, baixa, reprograma e exclui títulos em aberto; mantém os cadastros.
//  C - Consulta: somente visualiza telas, relatórios e exportações CSV.

const NIVEL_ADMIN = 'A';
const NIVEL_OPERADOR = 'B';
const NIVEL_CONSULTA = 'C';
const NIVEIS = [NIVEL_ADMIN, NIVEL_OPERADOR, NIVEL_CONSULTA];

module.exports = { NIVEL_ADMIN, NIVEL_OPERADOR, NIVEL_CONSULTA, NIVEIS };
