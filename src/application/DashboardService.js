'use strict';
const { today: todayIso } = require('../domain/dates');

const ALLOWED_PERIODS = [3, 6, 12];
const NEXT_DUE_LIMIT = 8;
const TOP_LIMIT = 6;

const monthOf = (isoDate) => isoDate.slice(0, 7);
const addDays = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Soma `n` meses a "YYYY-MM" (n pode ser negativo). */
function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

const monthRange = (start, count) => Array.from({ length: count }, (_, i) => addMonths(start, i));

/** Monta os dados do dashboard gerencial: indicadores, séries mensais, vencidos por faixa e rankings. */
class DashboardService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/repositories/DashboardRepository')} deps.dashboard
   * @param {import('../infrastructure/repositories/TituloRepository')} deps.titulos
   * @param {() => string} [deps.clock] data de hoje (ISO), injetável em testes
   */
  constructor({ dashboard, titulos, clock = todayIso }) {
    this.dashboard = dashboard;
    this.titulos = titulos;
    this.clock = clock;
  }

  /** @param {number|string} [meses] janela das séries mensais: 3, 6 ou 12 (padrão 6) */
  obter(meses) {
    const period = ALLOWED_PERIODS.includes(Number(meses)) ? Number(meses) : 6;
    const today = this.clock();
    const month = monthOf(today);
    const weekEnd = addDays(today, 7);

    const totals = this.dashboard.openTotals(today, weekEnd);
    const paidWindow = monthRange(addMonths(month, -(period - 1)), period);
    const dueWindow = monthRange(month, period);

    const paidRows = new Map(this.dashboard.paidByMonth(paidWindow[0]).map((r) => [r.mes, r]));
    const dueRows = new Map(this.dashboard.dueByMonth(today, dueWindow.at(-1)).map((r) => [r.mes, r]));
    const paidMonths = paidWindow.map((mes) => ({ mes, qtd: 0, pago: 0, juros: 0, descontos: 0, ...paidRows.get(mes) }));
    const dueMonths = dueWindow.map((mes) => ({ mes, qtd: 0, valor: 0, ...dueRows.get(mes) }));

    const current = paidRows.get(month);
    const previous = paidRows.get(addMonths(month, -1));
    const topFornecedores = this.dashboard.topSuppliersOpen(TOP_LIMIT);

    return {
      hoje: today,
      periodo: period,
      indicadores: {
        ...totals,
        pagoMes: current?.pago || 0,
        pagoMesAnterior: previous?.pago || 0,
        jurosMes: current?.juros || 0,
        descontosMes: current?.descontos || 0,
        concentracaoTopFornecedor: totals.abertos.valor > 0 && topFornecedores[0] ? topFornecedores[0].valor / totals.abertos.valor : 0,
      },
      aVencerPorMes: dueMonths,
      pagamentosPorMes: paidMonths,
      vencidosPorFaixa: this.dashboard.overdueAging(today),
      topFornecedores,
      porNatureza: this.dashboard.openByNatureza(TOP_LIMIT),
      porCentroCusto: this.dashboard.openByCentro(TOP_LIMIT),
      proximosVencimentos: this.titulos.search({ status: 'abertos', order: 'venc', limit: NEXT_DUE_LIMIT }),
    };
  }
}

module.exports = DashboardService;
