'use strict';
const NotFoundError = require('../domain/errors/NotFoundError');

const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Foto do perfil de acesso: cada usuário troca ou remove apenas a própria foto (auditado, sem gravar a imagem no log). */
class ProfilePhotoService {
  /**
   * @param {{usuarios: import('../infrastructure/repositories/UsuarioRepository'), validator: import('../domain/validation/ProfilePhotoValidator'), audit: import('./AuditTrail')}} deps
   */
  constructor({ usuarios, validator, audit }) {
    this.usuarios = usuarios;
    this.validator = validator;
    this.audit = audit;
  }

  save(user, dataUrl) {
    const { tipo, dados } = this.validator.parse(dataUrl);
    this.usuarios.savePhoto(user.id, dados, tipo);
    this.audit.record({ actor: user, acao: 'alterar', entidade: 'usuario', entidadeId: user.id, descricao: `Foto de perfil de ${user.usuario} atualizada` });
    return this.usuarios.findById(user.id);
  }

  remove(user) {
    this.usuarios.clearPhoto(user.id);
    this.audit.record({ actor: user, acao: 'alterar', entidade: 'usuario', entidadeId: user.id, descricao: `Foto de perfil de ${user.usuario} removida` });
    return this.usuarios.findById(user.id);
  }

  /** @returns {{tipo:string, dados:Buffer, extensao:string}} */
  get(id) {
    const photo = this.usuarios.findPhoto(id);
    if (!photo) throw new NotFoundError('Usuário sem foto');
    return { ...photo, extensao: EXTENSIONS[photo.tipo] };
  }
}

module.exports = ProfilePhotoService;
