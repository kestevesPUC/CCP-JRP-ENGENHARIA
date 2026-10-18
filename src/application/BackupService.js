'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Backup completo: cópia consistente do arquivo SQLite (cada backup gerado é auditado). */
class BackupService {
  /** @param {{db: import('../infrastructure/database/SqliteDatabase'), audit: import('./AuditTrail')}} deps */
  constructor({ db, audit }) {
    this.db = db;
    this.audit = audit;
  }

  /** @returns {{filename:string, content:Buffer}} */
  gerar(actor) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-backup-'));
    const target = path.join(dir, 'backup.sqlite');
    try {
      this.db.backupTo(target);
      const filename = `ccp-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      this.audit.record({ actor, acao: 'backup', entidade: 'sistema', descricao: `Backup do banco gerado (${filename})` });
      return { filename, content: fs.readFileSync(target) };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

module.exports = BackupService;
