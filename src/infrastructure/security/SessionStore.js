'use strict';
const crypto = require('node:crypto');

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

/** Sessões em memória, identificadas por token aleatório (cookie HttpOnly). */
class SessionStore {
  constructor({ ttlMs = EIGHT_HOURS, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.sessions = new Map();
  }

  create(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    this.sessions.set(token, { userId, expiresAt: this.now() + this.ttlMs });
    return token;
  }

  /** @returns {number|null} id do usuário dono da sessão válida */
  userIdFor(token) {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt < this.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session.userId;
  }

  /** Encerra todas as sessões de um usuário (ex.: após o administrador redefinir a senha dele). */
  destroyForUser(userId) {
    for (const [token, session] of this.sessions) if (session.userId === Number(userId)) this.sessions.delete(token);
  }

  destroy(token) {
    this.sessions.delete(token);
  }
}

module.exports = SessionStore;
