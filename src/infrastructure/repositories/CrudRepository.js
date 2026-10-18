'use strict';

/** CRUD genérico de tabelas simples (id + colunas de texto). Subclasses só declaram tabela e colunas. */
class CrudRepository {
  /**
   * @param {import('../database/SqliteDatabase')} db
   * @param {string} table nome fixo da tabela (nunca vem de entrada do usuário)
   * @param {string[]} columns colunas graváveis
   */
  constructor(db, table, columns) {
    this.db = db;
    this.table = table;
    this.columns = columns;
  }

  findAll() {
    return this.db.prepare(`SELECT id, ${this.columns.join(', ')} FROM ${this.table} ORDER BY nome COLLATE NOCASE, id`).all();
  }

  findById(id) {
    return this.db.prepare(`SELECT id, ${this.columns.join(', ')} FROM ${this.table} WHERE id = ?`).get(Number(id)) || null;
  }

  exists(id) {
    return !!this.db.prepare(`SELECT 1 FROM ${this.table} WHERE id = ?`).get(Number(id));
  }

  /** Cria o registro; se `data.id` vier preenchido (importação) preserva o código. */
  create(data) {
    const cols = data.id ? ['id', ...this.columns] : this.columns;
    const values = cols.map((c) => data[c] ?? (c === 'id' ? null : ''));
    const marks = cols.map(() => '?').join(', ');
    const { lastInsertRowid } = this.db.prepare(`INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${marks})`).run(...values);
    return this.findById(Number(lastInsertRowid));
  }

  update(id, data) {
    const sets = this.columns.map((c) => `${c} = ?`).join(', ');
    this.db.prepare(`UPDATE ${this.table} SET ${sets} WHERE id = ?`).run(...this.columns.map((c) => data[c] ?? ''), Number(id));
    return this.findById(id);
  }

  delete(id) {
    this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(Number(id));
  }
}

module.exports = CrudRepository;
