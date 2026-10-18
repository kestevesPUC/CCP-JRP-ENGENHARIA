'use strict';

/** Usuário "anônimo" para eventos sem sessão (ex.: tentativa de login com senha errada). */
const anonymous = (name) => ({ id: null, usuario: String(name || '(não informado)').slice(0, 40) });

/**
 * Registra no banco quem fez o quê (e o estado antes/depois). Chamado pelos serviços após cada modificação.
 * Nunca recebe senhas, hashes nem o conteúdo binário de fotos.
 */
class AuditTrail {
  /**
   * @param {{repository: import('../infrastructure/repositories/AuditRepository'), clock?: () => Date}} deps
   */
  constructor({ repository, clock = () => new Date() }) {
    this.repository = repository;
    this.clock = clock;
  }

  /**
   * @param {object} entry
   * @param {{id:number|null, usuario:string}} entry.actor
   * @param {string} entry.acao ex.: criar, alterar, excluir, baixar, estornar, reprogramar, importar, login
   * @param {string} entry.entidade ex.: titulo, fornecedor, usuario
   * @param {number} [entry.entidadeId]
   * @param {string} entry.descricao frase legível para a tela de auditoria
   * @param {object} [entry.antes]
   * @param {object} [entry.depois]
   */
  record({ actor, acao, entidade, entidadeId, descricao, antes, depois }) {
    this.repository.insert({
      em: this.clock().toISOString(), usuarioId: actor?.id, usuario: actor?.usuario || '(sistema)', acao, entidade, entidadeId, descricao, antes, depois,
    });
  }

  static anonymous(name) {
    return anonymous(name);
  }
}

module.exports = AuditTrail;
