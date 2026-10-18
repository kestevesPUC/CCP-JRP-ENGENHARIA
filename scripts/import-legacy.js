'use strict';
// Importa os .DBF do CCP original para o SQLite do novo sistema.
// Uso: node scripts/import-legacy.js <pasta-do-ccp-original> [arquivo.sqlite]
const fs = require('node:fs');
const path = require('node:path');
const { buildApplication } = require('../src/compositionRoot');
const DbfReader = require('../src/infrastructure/legacy/DbfReader');
const LegacyImporter = require('../src/infrastructure/legacy/LegacyImporter');

const [dir, target = path.join(__dirname, '..', 'data', 'ccp.sqlite')] = process.argv.slice(2);
if (!dir) {
  console.error('Uso: node scripts/import-legacy.js <pasta-do-ccp> [arquivo.sqlite]');
  process.exit(1);
}
if (fs.existsSync(target)) {
  console.error(`${target} já existe; remova-o ou escolha outro destino para evitar sobrescrever dados.`);
  process.exit(1);
}

const app = buildApplication({ dbFile: target });
const importer = new LegacyImporter({ db: app.db, reader: new DbfReader(), hasher: app.hasher, repositories: app.repositories });
const { counts, temporaryPassword, orphanReferences } = importer.import(dir);
app.db.close();

console.log(`Importado em ${target}:`, counts);
if (orphanReferences) console.warn(`Atenção: ${orphanReferences} referência(s) a cadastros inexistentes nos dados originais.`);
console.log(`Senha provisória de todos os usuários importados: ${temporaryPassword} (troca obrigatória no primeiro acesso)`);
