'use strict';
const ValidationError = require('../domain/errors/ValidationError');
const ConflictError = require('../domain/errors/ConflictError');
const NotFoundError = require('../domain/errors/NotFoundError');
const { NIVEIS } = require('../domain/niveis');

const MIN_PASSWORD_LENGTH = 6;

/** Administração de usuários (níveis A, B e C). A autorização (nível A) é aplicada na rota; tudo é auditado. */
class UsuarioService {
  /**
   * @param {{usuarios: import('../infrastructure/repositories/UsuarioRepository'), hasher: import('../infrastructure/security/PasswordHasher'), audit: import('./AuditTrail')}} deps
   */
  constructor({ usuarios, hasher, audit }) {
    this.usuarios = usuarios;
    this.hasher = hasher;
    this.audit = audit;
  }

  list() {
    return this.usuarios.findAll().map(UsuarioService.toPublic);
  }

  create(actor, body) {
    const usuario = String(body.usuario || '').trim().toUpperCase().slice(0, 10);
    const nivel = String(body.nivel || '').toUpperCase();
    if (!usuario || !NIVEIS.includes(nivel)) throw new ValidationError('Usuário e nível (A, B ou C) são obrigatórios');
    if (String(body.senha || '').length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    if (this.usuarios.findByUsuario(usuario)) throw new ConflictError('Usuário já existe');
    const criado = this.usuarios.create({ usuario, nivel, senha: this.hasher.hash(body.senha), mustChange: true });
    this.audit.record({
      actor, acao: 'criar', entidade: 'usuario', entidadeId: criado.id, descricao: `Usuário ${criado.usuario} criado (nível ${criado.nivel})`, depois: UsuarioService.snapshot(criado),
    });
    return UsuarioService.toPublic(criado);
  }

  remove(currentUser, id) {
    const alvo = this.usuarios.findById(id);
    if (!alvo) throw new NotFoundError('Usuário não encontrado');
    if (alvo.id === currentUser.id) throw new ConflictError('Não é possível excluir o próprio usuário');
    this.usuarios.delete(id);
    this.audit.record({
      actor: currentUser, acao: 'excluir', entidade: 'usuario', entidadeId: alvo.id, descricao: `Usuário ${alvo.usuario} excluído`, antes: UsuarioService.snapshot(alvo),
    });
    return { ok: true };
  }

  /** Visão pública do usuário (nunca expõe o hash da senha). */
  static toPublic(user) {
    return {
      id: user.id, usuario: user.usuario, nivel: user.nivel, mustChange: !!user.mustChange, temFoto: !!user.fotoEm, fotoVersao: user.fotoEm || null,
    };
  }

  /** Dados do usuário que podem ir para a auditoria (sem senha). */
  static snapshot(user) {
    return { id: user.id, usuario: user.usuario, nivel: user.nivel };
  }
}

module.exports = UsuarioService;
