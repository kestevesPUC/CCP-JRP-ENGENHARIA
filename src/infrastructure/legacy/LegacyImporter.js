'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/** Importa os .DBF do CCP original (Clipper) para o banco SQLite, preservando os códigos. */
class LegacyImporter {
  /**
   * @param {object} deps
   * @param {import('../database/SqliteDatabase')} deps.db
   * @param {import('./DbfReader')} deps.reader
   * @param {import('../security/PasswordHasher')} deps.hasher
   * @param {{fornecedores:object, naturezas:object, centros:object, usuarios:object, titulos:object}} deps.repositories
   */
  constructor({ db, reader, hasher, repositories }) {
    this.db = db;
    this.reader = reader;
    this.hasher = hasher;
    this.repos = repositories;
  }

  /**
   * @param {string} dir pasta do sistema original
   * @returns {{counts:object, temporaryPassword:string, orphanReferences:number}}
   */
  import(dir) {
    const temporaryPassword = crypto.randomBytes(5).toString('hex');
    // As senhas do original usam substituição de caracteres (SENCAS) e não são reaproveitadas.
    this.db.exec('PRAGMA foreign_keys = OFF');
    try {
      this.db.transaction(() => {
        this.#importCadastros(dir);
        this.#importUsuarios(dir, temporaryPassword);
        this.#importTitulos(dir);
      });
    } finally {
      this.db.exec('PRAGMA foreign_keys = ON');
    }
    const orphanReferences = this.db.prepare('PRAGMA foreign_key_check').all().length;
    return { counts: this.#counts(), temporaryPassword, orphanReferences };
  }

  #file(dir, name) {
    const found = fs.readdirSync(dir).find((f) => f.toLowerCase() === name);
    if (!found) throw new Error(`Arquivo ${name} não encontrado em ${dir}`);
    return path.join(dir, found);
  }

  #importCadastros(dir) {
    for (const r of this.reader.read(this.#file(dir, 'forn.dbf'))) {
      this.repos.fornecedores.create({
        id: r.codi, nome: r.forn, pess: r.pess, ende: r.ende, bair: r.bair, cida: r.cida, esta: r.esta,
        cep: r.cep, fone: r.fone, fax: r.fax, cgc: r.cgc, insc: r.insc, con1: r.con1, con2: r.con2,
      });
    }
    for (const r of this.reader.read(this.#file(dir, 'natu.dbf'))) this.repos.naturezas.create({ id: r.codnat, nome: r.nature });
    for (const r of this.reader.read(this.#file(dir, 'cc.dbf'))) this.repos.centros.create({ id: r.codcc, nome: r.centro });
  }

  #importUsuarios(dir, temporaryPassword) {
    const senha = this.hasher.hash(temporaryPassword);
    for (const r of this.reader.read(this.#file(dir, 't.dbf'))) {
      this.repos.usuarios.create({
        id: r.codusu, usuario: r.usuario.toUpperCase(), nivel: ['A', 'B', 'C'].includes(r.nivel) ? r.nivel : 'C',
        senha, mustChange: true, dataCad: r.data_cad || undefined,
      });
    }
  }

  #importTitulos(dir) {
    for (const r of this.reader.read(this.#file(dir, 'ccp.dbf'))) {
      const rateio = [1, 2, 3, 4].map((n) => ({ cc: r[`cc${n}`], valor: r[`vrcc${n}`] })).filter((x) => x.cc && x.valor > 0);
      const baixa = r.dtpag
        ? { dtpag: r.dtpag, receb: r.receb, juros: r.juros, desco: r.desco, noche: r.noche, banco: r.banco, vrche: r.vrche }
        : null;
      this.repos.titulos.create({
        codig: r.codig, natur: r.natur, docum: r.docum, histo: r.histo, dtvec: r.dtvec, dtemi: r.dtemi || r.dtvec, valor: r.valor,
        local: r.local, notaf: r.notaf, rateio, baixa, dtrep: r.dtrep || '', valre: r.valre,
      });
    }
  }

  #counts() {
    const count = (table) => this.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    return {
      fornecedores: count('fornecedores'), naturezas: count('naturezas'), centros: count('centros'), titulos: count('titulos'), usuarios: count('usuarios'),
    };
  }
}

module.exports = LegacyImporter;
