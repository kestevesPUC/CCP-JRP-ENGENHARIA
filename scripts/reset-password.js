'use strict';
// Redefine a senha de um usuário (troca obrigatória no próximo acesso).
// Uso: node scripts/reset-password.js <arquivo.sqlite> <USUARIO> <nova-senha>
const { buildApplication } = require('../src/compositionRoot');

const [dbFile, usuario, novaSenha] = process.argv.slice(2);
if (!dbFile || !usuario || !novaSenha || novaSenha.length < 6) {
  console.error('Uso: node scripts/reset-password.js <arquivo.sqlite> <USUARIO> <nova-senha (mín. 6)>');
  process.exit(1);
}
const app = buildApplication({ dbFile });
const user = app.repositories.usuarios.findByUsuario(usuario.toUpperCase());
if (!user) {
  console.error(`Usuário ${usuario} não encontrado. Existentes: ${app.repositories.usuarios.findAll().map((u) => u.usuario).join(', ')}`);
  process.exit(1);
}
app.repositories.usuarios.updatePassword(user.id, app.hasher.hash(novaSenha), true);
app.db.close();
console.log(`Senha de ${user.usuario} redefinida em ${dbFile}.`);
