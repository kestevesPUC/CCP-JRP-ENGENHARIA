'use strict';
const UnauthorizedError = require('../domain/errors/UnauthorizedError');
const TooManyAttemptsError = require('../domain/errors/TooManyAttemptsError');
const ValidationError = require('../domain/errors/ValidationError');
const AuditTrail = require('./AuditTrail');

const MIN_PASSWORD_LENGTH = 6;

/** Autenticação: login com bloqueio por tentativas, sessões e troca de senha. Entradas, falhas e trocas de senha são auditadas. */
class AuthService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/repositories/UsuarioRepository')} deps.usuarios
   * @param {import('../infrastructure/security/PasswordHasher')} deps.hasher
   * @param {import('../infrastructure/security/SessionStore')} deps.sessions
   * @param {import('../infrastructure/security/LoginThrottle')} deps.throttle
   * @param {import('./AuditTrail')} deps.audit
   */
  constructor({ usuarios, hasher, sessions, throttle, audit }) {
    this.usuarios = usuarios;
    this.hasher = hasher;
    this.sessions = sessions;
    this.throttle = throttle;
    this.audit = audit;
  }

  login(usuarioInformado, senha) {
    const login = String(usuarioInformado || '').trim().toUpperCase();
    if (this.throttle.isBlocked(login)) {
      this.#logAttempt(login, 'login_bloqueado', `Login bloqueado por excesso de tentativas (${login})`);
      throw new TooManyAttemptsError();
    }
    const user = this.usuarios.findByUsuario(login);
    if (!user || !this.hasher.verify(String(senha || ''), user.senha)) {
      this.throttle.registerFailure(login);
      this.#logAttempt(login, 'login_falha', `Tentativa de login com senha incorreta (${login})`);
      throw new UnauthorizedError('Usuário ou senha incorretos');
    }
    this.throttle.reset(login);
    this.audit.record({ actor: user, acao: 'login', entidade: 'sessao', entidadeId: user.id, descricao: `${user.usuario} entrou no sistema` });
    return { user, token: this.sessions.create(user.id) };
  }

  logout(token, user) {
    this.sessions.destroy(token);
    if (user) this.audit.record({ actor: user, acao: 'logout', entidade: 'sessao', entidadeId: user.id, descricao: `${user.usuario} saiu do sistema` });
  }

  /** @returns {object|null} usuário da sessão, se válida */
  resolveUser(token) {
    const userId = this.sessions.userIdFor(token);
    return userId ? this.usuarios.findById(userId) : null;
  }

  changePassword(user, atual, nova) {
    if (String(nova || '').length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    if (!this.hasher.verify(String(atual || ''), user.senha)) throw new ValidationError('Senha atual incorreta');
    this.usuarios.updatePassword(user.id, this.hasher.hash(nova), false);
    this.audit.record({ actor: user, acao: 'senha', entidade: 'usuario', entidadeId: user.id, descricao: `${user.usuario} trocou a própria senha` });
  }

  #logAttempt(login, acao, descricao) {
    this.audit.record({ actor: AuditTrail.anonymous(login), acao, entidade: 'sessao', descricao });
  }
}

module.exports = AuthService;
