'use strict';
const { toCents, fromCents } = require('../../domain/money');

const SELECT = `
  SELECT t.*, f.nome AS fornecedor_nome, n.nome AS natureza_nome
  FROM titulos t
  JOIN fornecedores f ON f.id = t.fornecedor_id
  JOIN naturezas n ON n.id = t.natureza_id`;

const ORDERS = {
  venc: 't.dt_venc, t.id',
  pag: 't.dt_pag, t.id',
  rep: 't.dt_rep, t.id',
};

const CHUNK = 500;

function toEntity(row, rateio) {
  return {
    id: row.id,
    codig: row.fornecedor_id,
    natur: row.natureza_id,
    docum: row.docum,
    histo: row.histo,
    dtvec: row.dt_venc,
    dtemi: row.dt_emi,
    valor: fromCents(row.valor_cents),
    local: row.local_pg,
    notaf: row.notaf,
    dtrep: row.dt_rep || '',
    valre: fromCents(row.valre_cents),
    rateio,
    baixa: row.dt_pag
      ? {
        dtpag: row.dt_pag, receb: fromCents(row.receb_cents), juros: fromCents(row.juros_cents), desco: fromCents(row.desco_cents),
        noche: row.noche, banco: row.banco, vrche: fromCents(row.vrche_cents),
      }
      : null,
    fornecedor: row.fornecedor_nome,
    natureza: row.natureza_nome,
  };
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** "1.003,12" ou "800" -> centavos; null se o texto não parecer um valor. */
function parseMoneyQuery(text) {
  if (!/^\d[\d.,]*$/.test(text)) return null;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? toCents(number) : null;
}

const SEARCH_COLUMNS = ['t.docum', 't.histo', 'f.nome', 'n.nome', 't.notaf', 't.local_pg'];

class TituloRepository {
  /** @param {import('../database/SqliteDatabase')} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * Busca títulos. Filtros: q (texto livre: documento, histórico, fornecedor, natureza, NF, local ou valor), docum, codig, natur, cc, valor, status ('abertos'|'pagos'),
   * de/ate (vencimento), pagDe/pagAte, repDe/repAte, order ('venc'|'pag'|'rep'), limit.
   */
  search(filters = {}) {
    const where = [];
    const params = [];
    const add = (clause, ...values) => { where.push(clause); params.push(...values); };

    const q = String(filters.q || '').trim();
    if (q) {
      const like = `%${escapeLike(q.toUpperCase())}%`;
      const cents = parseMoneyQuery(q);
      const textMatch = SEARCH_COLUMNS.map((column) => `${column} LIKE ? ESCAPE '\\'`).join(' OR ');
      add(`(${textMatch}${cents === null ? '' : ' OR t.valor_cents = ?'})`, ...SEARCH_COLUMNS.map(() => like), ...(cents === null ? [] : [cents]));
    }
    if (filters.docum) add("t.docum LIKE ? ESCAPE '\\'", `%${escapeLike(String(filters.docum).toUpperCase())}%`);
    if (filters.codig) add('t.fornecedor_id = ?', Number(filters.codig));
    if (filters.natur) add('t.natureza_id = ?', Number(filters.natur));
    if (filters.cc) add('EXISTS (SELECT 1 FROM titulo_rateio r WHERE r.titulo_id = t.id AND r.centro_id = ?)', Number(filters.cc));
    if (filters.valor) add('t.valor_cents = ?', toCents(filters.valor));
    if (filters.status === 'abertos') where.push('t.dt_pag IS NULL');
    if (filters.status === 'pagos') where.push('t.dt_pag IS NOT NULL');
    if (filters.de) add('t.dt_venc >= ?', filters.de);
    if (filters.ate) add('t.dt_venc <= ?', filters.ate);
    if (filters.pagDe) add('t.dt_pag >= ?', filters.pagDe);
    if (filters.pagAte) add('t.dt_pag <= ?', filters.pagAte);
    if (filters.repDe) add('t.dt_rep >= ?', filters.repDe);
    if (filters.repAte) add('t.dt_rep <= ?', filters.repAte);

    const order = ORDERS[filters.order] || ORDERS.venc;
    const limit = filters.limit ? ` LIMIT ${Math.max(1, Math.floor(Number(filters.limit)))}` : '';
    const sql = `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}${limit}`;
    return this.#hydrate(this.db.prepare(sql).all(...params));
  }

  findById(id) {
    const row = this.db.prepare(`${SELECT} WHERE t.id = ?`).get(Number(id));
    return row ? this.#hydrate([row])[0] : null;
  }

  create(titulo) {
    return this.db.transaction(() => {
      const cols = ['fornecedor_id', 'natureza_id', 'docum', 'histo', 'dt_venc', 'dt_emi', 'valor_cents', 'local_pg', 'notaf'];
      const values = [titulo.codig, titulo.natur, titulo.docum, titulo.histo, titulo.dtvec, titulo.dtemi, toCents(titulo.valor), titulo.local, titulo.notaf];
      if (titulo.id) { cols.unshift('id'); values.unshift(titulo.id); }
      const { lastInsertRowid } = this.db.prepare(`INSERT INTO titulos (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...values);
      const id = Number(lastInsertRowid);
      this.#replaceRateio(id, titulo.rateio);
      if (titulo.dtrep) this.saveReprogramacao(id, titulo.dtrep, titulo.valre);
      if (titulo.baixa) this.saveBaixa(id, titulo.baixa);
      return this.findById(id);
    });
  }

  update(id, titulo) {
    return this.db.transaction(() => {
      this.db.prepare(`UPDATE titulos SET fornecedor_id = ?, natureza_id = ?, docum = ?, histo = ?, dt_venc = ?, dt_emi = ?,
        valor_cents = ?, local_pg = ?, notaf = ? WHERE id = ?`)
        .run(titulo.codig, titulo.natur, titulo.docum, titulo.histo, titulo.dtvec, titulo.dtemi, toCents(titulo.valor), titulo.local, titulo.notaf, Number(id));
      this.#replaceRateio(id, titulo.rateio);
      return this.findById(id);
    });
  }

  delete(id) {
    this.db.prepare('DELETE FROM titulos WHERE id = ?').run(Number(id));
  }

  saveBaixa(id, b) {
    this.db.prepare(`UPDATE titulos SET dt_pag = ?, receb_cents = ?, juros_cents = ?, desco_cents = ?, noche = ?, banco = ?, vrche_cents = ? WHERE id = ?`)
      .run(b.dtpag, toCents(b.receb), toCents(b.juros), toCents(b.desco), b.noche, b.banco, toCents(b.vrche), Number(id));
    return this.findById(id);
  }

  clearBaixa(id) {
    this.db.prepare('UPDATE titulos SET dt_pag = NULL, receb_cents = NULL, juros_cents = NULL, desco_cents = NULL, noche = NULL, banco = NULL, vrche_cents = NULL WHERE id = ?').run(Number(id));
    return this.findById(id);
  }

  saveReprogramacao(id, dtrep, valre) {
    this.db.prepare('UPDATE titulos SET dt_rep = ?, valre_cents = ? WHERE id = ?').run(dtrep, toCents(valre), Number(id));
    return this.findById(id);
  }

  /** Totais para o painel: em aberto, vencidos (antes de `today`) e vencendo em `today`. */
  summary(today) {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) AS abertos, COALESCE(SUM(valor_cents), 0) AS total_aberto,
        COALESCE(SUM(dt_venc < ?), 0) AS vencidos,
        COALESCE(SUM(CASE WHEN dt_venc < ? THEN valor_cents END), 0) AS total_vencido,
        COALESCE(SUM(CASE WHEN dt_venc = ? THEN valor_cents END), 0) AS hoje
      FROM titulos WHERE dt_pag IS NULL`).get(today, today, today);
    return {
      abertos: row.abertos, totalAberto: fromCents(row.total_aberto), vencidos: row.vencidos, totalVencido: fromCents(row.total_vencido), hoje: fromCents(row.hoje),
    };
  }

  countByFornecedor(id) {
    return this.db.prepare('SELECT COUNT(*) AS n FROM titulos WHERE fornecedor_id = ?').get(Number(id)).n;
  }

  countByNatureza(id) {
    return this.db.prepare('SELECT COUNT(*) AS n FROM titulos WHERE natureza_id = ?').get(Number(id)).n;
  }

  countByCentro(id) {
    return this.db.prepare('SELECT COUNT(*) AS n FROM titulo_rateio WHERE centro_id = ?').get(Number(id)).n;
  }

  #replaceRateio(id, rateio) {
    this.db.prepare('DELETE FROM titulo_rateio WHERE titulo_id = ?').run(Number(id));
    const insert = this.db.prepare('INSERT INTO titulo_rateio (titulo_id, centro_id, valor_cents) VALUES (?, ?, ?)');
    for (const r of rateio) insert.run(Number(id), r.cc, toCents(r.valor));
  }

  #hydrate(rows) {
    const byTitulo = new Map(rows.map((r) => [r.id, []]));
    for (let i = 0; i < rows.length; i += CHUNK) {
      const ids = rows.slice(i, i + CHUNK).map((r) => r.id);
      const sql = `SELECT titulo_id, centro_id, valor_cents FROM titulo_rateio WHERE titulo_id IN (${ids.map(() => '?').join(', ')}) ORDER BY rowid`;
      for (const r of this.db.prepare(sql).all(...ids)) byTitulo.get(r.titulo_id).push({ cc: r.centro_id, valor: fromCents(r.valor_cents) });
    }
    return rows.map((row) => toEntity(row, byTitulo.get(row.id)));
  }
}

module.exports = TituloRepository;
