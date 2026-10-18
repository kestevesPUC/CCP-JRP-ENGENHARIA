'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const MIGRATIONS = require('./migrations');

/** Encapsula a conexão SQLite (node:sqlite): migrações, transações e backup. */
class SqliteDatabase {
  /** @param {string} file caminho do arquivo ou ':memory:' */
  constructor(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.file = file;
    this.connection = new DatabaseSync(file);
    this.connection.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.#migrate();
  }

  prepare(sql) {
    return this.connection.prepare(sql);
  }

  exec(sql) {
    this.connection.exec(sql);
  }

  /** Executa `work` numa transação; reverte se lançar. Aceita aninhamento (reutiliza a externa). */
  transaction(work) {
    if (this.inTransaction) return work();
    this.exec('BEGIN');
    this.inTransaction = true;
    try {
      const result = work();
      this.exec('COMMIT');
      return result;
    } catch (error) {
      this.exec('ROLLBACK');
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  /** Copia consistente do banco para `target` (VACUUM INTO). */
  backupTo(target) {
    this.prepare('VACUUM INTO ?').run(target);
  }

  close() {
    this.connection.close();
  }

  #migrate() {
    const current = this.prepare('PRAGMA user_version').get().user_version;
    for (let version = current; version < MIGRATIONS.length; version++) {
      this.transaction(() => {
        this.exec(MIGRATIONS[version]);
        this.exec(`PRAGMA user_version = ${version + 1}`);
      });
    }
  }
}

module.exports = SqliteDatabase;
