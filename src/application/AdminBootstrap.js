'use strict';
const crypto = require('node:crypto');

/** Garante que exista ao menos um usuário: cria ADMIN (nível A) com senha provisória na primeira execução. */
class AdminBootstrap {
  /** @param {{usuarios: object, hasher: object, audit: import('./AuditTrail')}} deps */
  constructor({ usuarios, hasher, audit }) {
    this.usuarios = usuarios;
    this.hasher = hasher;
    this.audit = audit;
  }

  /** @returns {string|null} senha provisória gerada, ou null se já havia usuários */
  ensureAdmin() {
    if (this.usuarios.count() > 0) return null;
    const password = crypto.randomBytes(6).toString('hex');
    const admin = this.usuarios.create({ usuario: 'ADMIN', nivel: 'A', senha: this.hasher.hash(password), mustChange: true });
    this.audit.record({
      actor: null, acao: 'criar', entidade: 'usuario', entidadeId: admin.id, descricao: 'Usuário ADMIN inicial criado pelo sistema', depois: { id: admin.id, usuario: 'ADMIN', nivel: 'A' },
    });
    return password;
  }
}

module.exports = AdminBootstrap;
