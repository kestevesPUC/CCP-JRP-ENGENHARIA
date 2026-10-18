'use strict';

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const toEntity = (row, withDetails) => row && ({
  id: row.id,
  em: row.em,
  usuarioId: row.usuario_id,
  usuario: row.usuario,
  acao: row.acao,
  entidade: row.entidade,
  entidadeId: row.entidade_id,
  descricao: row.descricao,
  ...(withDetails && { antes: row.antes ? JSON.parse(row.antes) : null, depois: row.depois ? JSON.parse(row.depois) : null }),
});

/** Persistência da trilha de auditoria (somente inclusão e consulta; a tabela é imutável). */
class AuditRepository {
  /** @param {import('../database/SqliteDatabase')} db */
  constructor(db) {
    this.db = db;
  }

  insert({ em, usuarioId, usuario, acao, entidade, entidadeId, descricao, antes, depois }) {
    this.db.prepare(`INSERT INTO auditoria (em, usuario_id, usuario, acao, entidade, entidade_id, descricao, antes, depois)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(em, usuarioId ?? null, usuario, acao, entidade, entidadeId ?? null, descricao,
        antes === undefined || antes === null ? null : JSON.stringify(antes), depois === undefined || depois === null ? null : JSON.stringify(depois));
  }

  /** Filtros: q (texto), usuario, acao, entidade, de/ate (datas locais), limit. Mais recentes primeiro. */
  search(filters = {}) {
    const where = [];
    const params = [];
    const add = (clause, ...values) => { where.push(clause); params.push(...values); };

    const q = String(filters.q || '').trim();
    if (q) {
      const like = `%${escapeLike(q)}%`;
      add("(descricao LIKE ? ESCAPE '\\' OR usuario LIKE ? ESCAPE '\\' OR entidade LIKE ? ESCAPE '\\' OR acao LIKE ? ESCAPE '\\')", like, like, like, like);
    }
    if (filters.usuario) add('usuario = ?', filters.usuario);
    if (filters.acao) add('acao = ?', filters.acao);
    if (filters.entidade) add('entidade = ?', filters.entidade);
    if (filters.entidadeId) add('entidade_id = ?', Number(filters.entidadeId));
    if (filters.de) add("date(em, 'localtime') >= ?", filters.de);
    if (filters.ate) add("date(em, 'localtime') <= ?", filters.ate);

    const limit = Math.min(Math.max(Math.floor(Number(filters.limit)) || 1000, 1), 5000);
    const sql = `SELECT id, em, usuario_id, usuario, acao, entidade, entidade_id, descricao FROM auditoria
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ${limit}`;
    return this.db.prepare(sql).all(...params).map((row) => toEntity(row, false));
  }

  findById(id) {
    return toEntity(this.db.prepare('SELECT * FROM auditoria WHERE id = ?').get(Number(id)), true) || null;
  }

  /** Valores distintos para montar os filtros da tela. */
  distinct(column) {
    if (!['usuario', 'acao', 'entidade'].includes(column)) throw new Error('Coluna inválida');
    return this.db.prepare(`SELECT DISTINCT ${column} AS valor FROM auditoria ORDER BY valor`).all().map((r) => r.valor);
  }
}

module.exports = AuditRepository;
