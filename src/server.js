'use strict';
const path = require('node:path');
const { buildApplication } = require('./compositionRoot');

async function main() {
  const dbFile = process.env.CCP_DB || path.join(__dirname, '..', 'data', 'ccp.sqlite');
  const port = Number(process.env.PORT) || 3000;
  const app = buildApplication({ dbFile });

  const password = app.adminBootstrap.ensureAdmin();
  if (password) console.log(`Usuário inicial criado: ADMIN / ${password}  (troca obrigatória no 1º acesso)`);

  const { port: listening } = await app.httpServer.listen(port);
  console.log(`CCP — Controle de Contas a Pagar em http://localhost:${listening}  (banco: ${dbFile})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
