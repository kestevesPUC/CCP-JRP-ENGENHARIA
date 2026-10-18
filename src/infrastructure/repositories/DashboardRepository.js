'use strict';
const { fromCents } = require('../../domain/money');

const money = (cents) => fromCents(cents || 0);

/** Consultas agregadas (somente leitura) que alimentam o dashboard gerencial. Datas ISO; valores em centavos. */
class DashboardRepository {
  /** @param {import('../database/SqliteDatabase')} db */
  constructor(db) {
    this.db = db;
  }

  /** Totais dos títulos em aberto: geral, vencidos, vencendo hoje e vencendo nos próximos `days` dias. */
  openTotals(today, weekEnd) {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) AS qtd, COALESCE(SUM(valor_cents), 0) AS total,
        COALESCE(SUM(dt_venc < @today), 0) AS qtd_vencidos,
        COALESCE(SUM(CASE WHEN dt_venc < @today THEN valor_cents END), 0) AS total_vencidos,
        COALESCE(SUM(dt_venc = @today), 0) AS qtd_hoje,
        COALESCE(SUM(CASE WHEN dt_venc = @today THEN valor_cents END), 0) AS total_hoje,
        COALESCE(SUM(dt_venc >= @today AND dt_venc <= @weekEnd), 0) AS qtd_semana,
        COALESCE(SUM(CASE WHEN dt_venc >= @today AND dt_venc <= @weekEnd THEN valor_cents END), 0) AS total_semana
      FROM titulos WHERE dt_pag IS NULL`).get({ today, weekEnd });
    return {
      abertos: { qtd: row.qtd, valor: money(row.total) },
      vencidos: { qtd: row.qtd_vencidos, valor: money(row.total_vencidos) },
      hoje: { qtd: row.qtd_hoje, valor: money(row.total_hoje) },
      semana: { qtd: row.qtd_semana, valor: money(row.total_semana) },
    };
  }

  /** Vencidos por faixa de atraso (dias): 1-30, 31-60, 61-90 e mais de 90. */
  overdueAging(today) {
    const row = this.db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN d BETWEEN 1 AND 30 THEN 1 END), 0) AS q1, COALESCE(SUM(CASE WHEN d BETWEEN 1 AND 30 THEN v END), 0) AS v1,
        COALESCE(SUM(CASE WHEN d BETWEEN 31 AND 60 THEN 1 END), 0) AS q2, COALESCE(SUM(CASE WHEN d BETWEEN 31 AND 60 THEN v END), 0) AS v2,
        COALESCE(SUM(CASE WHEN d BETWEEN 61 AND 90 THEN 1 END), 0) AS q3, COALESCE(SUM(CASE WHEN d BETWEEN 61 AND 90 THEN v END), 0) AS v3,
        COALESCE(SUM(CASE WHEN d > 90 THEN 1 END), 0) AS q4, COALESCE(SUM(CASE WHEN d > 90 THEN v END), 0) AS v4
      FROM (SELECT CAST(julianday(?) - julianday(dt_venc) AS INTEGER) AS d, valor_cents AS v FROM titulos WHERE dt_pag IS NULL AND dt_venc < ?)`).get(today, today);
    return [
      { faixa: '1 a 30 dias', qtd: row.q1, valor: money(row.v1) },
      { faixa: '31 a 60 dias', qtd: row.q2, valor: money(row.v2) },
      { faixa: '61 a 90 dias', qtd: row.q3, valor: money(row.v3) },
      { faixa: 'Mais de 90 dias', qtd: row.q4, valor: money(row.v4) },
    ];
  }

  /** A vencer por mês (YYYY-MM) a partir de `fromDate`, limitado a `toMonth` inclusive. */
  dueByMonth(fromDate, toMonth) {
    return this.db.prepare(`
      SELECT substr(dt_venc, 1, 7) AS mes, COUNT(*) AS qtd, SUM(valor_cents) AS valor
      FROM titulos WHERE dt_pag IS NULL AND dt_venc >= ? AND substr(dt_venc, 1, 7) <= ? GROUP BY mes ORDER BY mes`)
      .all(fromDate, toMonth).map((r) => ({ mes: r.mes, qtd: r.qtd, valor: money(r.valor) }));
  }

  /** Pagamentos realizados por mês (YYYY-MM) desde `fromMonth`: total pago, juros e descontos. */
  paidByMonth(fromMonth) {
    return this.db.prepare(`
      SELECT substr(dt_pag, 1, 7) AS mes, COUNT(*) AS qtd, SUM(receb_cents) AS pago, SUM(juros_cents) AS juros, SUM(desco_cents) AS descontos
      FROM titulos WHERE dt_pag IS NOT NULL AND substr(dt_pag, 1, 7) >= ? GROUP BY mes ORDER BY mes`)
      .all(fromMonth).map((r) => ({ mes: r.mes, qtd: r.qtd, pago: money(r.pago), juros: money(r.juros), descontos: money(r.descontos) }));
  }

  /** Maiores fornecedores em aberto. */
  topSuppliersOpen(limit) {
    return this.db.prepare(`
      SELECT f.id, f.nome, COUNT(*) AS qtd, SUM(t.valor_cents) AS valor
      FROM titulos t JOIN fornecedores f ON f.id = t.fornecedor_id WHERE t.dt_pag IS NULL
      GROUP BY f.id ORDER BY valor DESC LIMIT ?`).all(limit).map((r) => ({ id: r.id, nome: r.nome, qtd: r.qtd, valor: money(r.valor) }));
  }

  /** Em aberto por natureza de pagamento. */
  openByNatureza(limit) {
    return this.db.prepare(`
      SELECT n.id, n.nome, COUNT(*) AS qtd, SUM(t.valor_cents) AS valor
      FROM titulos t JOIN naturezas n ON n.id = t.natureza_id WHERE t.dt_pag IS NULL
      GROUP BY n.id ORDER BY valor DESC LIMIT ?`).all(limit).map((r) => ({ id: r.id, nome: r.nome, qtd: r.qtd, valor: money(r.valor) }));
  }

  /** Em aberto por centro de custo, considerando o valor rateado de cada título. */
  openByCentro(limit) {
    return this.db.prepare(`
      SELECT c.id, c.nome, COUNT(DISTINCT t.id) AS qtd, SUM(r.valor_cents) AS valor
      FROM titulo_rateio r JOIN titulos t ON t.id = r.titulo_id JOIN centros c ON c.id = r.centro_id WHERE t.dt_pag IS NULL
      GROUP BY c.id ORDER BY valor DESC LIMIT ?`).all(limit).map((r) => ({ id: r.id, nome: r.nome, qtd: r.qtd, valor: money(r.valor) }));
  }
}

module.exports = DashboardRepository;
