'use strict';

// Colunas sem o BLOB da foto (carregado só sob demanda).
const COLUMNS = 'id, usuario, nivel, senha_hash, must_change, data_cad, foto_em';

const toEntity = (row) => row && {
  id: row.id, usuario: row.usuario, nivel: row.nivel, senha: row.senha_hash, mustChange: !!row.must_change, dataCad: row.data_cad, fotoEm: row.foto_em,
};

class UsuarioRepository {
  /** @param {import('../database/SqliteDatabase')} db */
  constructor(db) {
    this.db = db;
  }

  findAll() {
    return this.db.prepare(`SELECT ${COLUMNS} FROM usuarios ORDER BY usuario`).all().map(toEntity);
  }

  findById(id) {
    return toEntity(this.db.prepare(`SELECT ${COLUMNS} FROM usuarios WHERE id = ?`).get(Number(id))) || null;
  }

  findByUsuario(usuario) {
    return toEntity(this.db.prepare(`SELECT ${COLUMNS} FROM usuarios WHERE usuario = ?`).get(usuario)) || null;
  }

  count() {
    return this.db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  }

  /** @param {{id?:number, usuario:string, nivel:string, senha:string, mustChange?:boolean, dataCad?:string}} u */
  create(u) {
    const cols = ['usuario', 'nivel', 'senha_hash', 'must_change', 'data_cad'];
    const values = [u.usuario, u.nivel, u.senha, u.mustChange === false ? 0 : 1, u.dataCad || new Date().toISOString().slice(0, 10)];
    if (u.id) {
      cols.unshift('id');
      values.unshift(u.id);
    }
    const { lastInsertRowid } = this.db.prepare(`INSERT INTO usuarios (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...values);
    return this.findById(Number(lastInsertRowid));
  }

  updatePassword(id, senhaHash, mustChange) {
    this.db.prepare('UPDATE usuarios SET senha_hash = ?, must_change = ? WHERE id = ?').run(senhaHash, mustChange ? 1 : 0, Number(id));
  }

  /** @returns {{tipo:string, dados:Buffer}|null} */
  findPhoto(id) {
    const row = this.db.prepare('SELECT foto, foto_tipo FROM usuarios WHERE id = ?').get(Number(id));
    return row?.foto ? { tipo: row.foto_tipo, dados: Buffer.from(row.foto) } : null;
  }

  savePhoto(id, dados, tipo) {
    this.db.prepare('UPDATE usuarios SET foto = ?, foto_tipo = ?, foto_em = ? WHERE id = ?').run(dados, tipo, new Date().toISOString(), Number(id));
  }

  clearPhoto(id) {
    this.db.prepare('UPDATE usuarios SET foto = NULL, foto_tipo = NULL, foto_em = NULL WHERE id = ?').run(Number(id));
  }

  delete(id) {
    this.db.prepare('DELETE FROM usuarios WHERE id = ?').run(Number(id));
  }
}

module.exports = UsuarioRepository;
