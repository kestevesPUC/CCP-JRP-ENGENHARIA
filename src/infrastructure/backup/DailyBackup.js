'use strict';
const fs = require('node:fs');
const path = require('node:path');

const FILE_PATTERN = /^ccp-\d{4}-\d{2}-\d{2}\.sqlite$/;

/**
 * Cópia de segurança automática: no máximo uma por dia (ccp-AAAA-MM-DD.sqlite), mantendo as `keep` mais recentes.
 * Fica fora da pasta de dados do aplicativo, então sobrevive até a uma limpeza completa dessa pasta.
 */
class DailyBackup {
  /**
   * @param {object} deps
   * @param {{backupTo(target:string): void}} deps.db
   * @param {string} deps.dir pasta de destino
   * @param {number} [deps.keep] quantidade de backups preservados
   * @param {() => Date} [deps.clock]
   */
  constructor({ db, dir, keep = 14, clock = () => new Date() }) {
    this.db = db;
    this.dir = dir;
    this.keep = keep;
    this.clock = clock;
  }

  /** @returns {{created: boolean, file: string}} */
  run() {
    fs.mkdirSync(this.dir, { recursive: true });
    const file = path.join(this.dir, `ccp-${this.clock().toISOString().slice(0, 10)}.sqlite`);
    const created = !fs.existsSync(file);
    if (created) this.db.backupTo(file);
    this.#prune();
    return { created, file };
  }

  #prune() {
    const files = fs.readdirSync(this.dir).filter((name) => FILE_PATTERN.test(name)).sort().reverse();
    for (const name of files.slice(this.keep)) fs.rmSync(path.join(this.dir, name), { force: true });
  }
}

module.exports = DailyBackup;
