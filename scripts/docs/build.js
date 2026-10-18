'use strict';
// Gera as documentações em .docx: node scripts/docs/build.js  (ou: npm run docs:docx)
const path = require('node:path');
const { buildTecnica } = require('./tecnica');
const { buildFuncional } = require('./funcional');

const out = path.join(__dirname, '..', '..', 'docs');

(async () => {
  console.log(await buildTecnica(path.join(out, 'CCP-Documentacao-Tecnica.docx')));
  console.log(await buildFuncional(path.join(out, 'CCP-Documentacao-Funcional.docx')));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
