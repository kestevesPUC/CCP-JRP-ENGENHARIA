'use strict';
const NotFoundError = require('../domain/errors/NotFoundError');
const { toCents, fromCents } = require('../domain/money');

/**
 * Relatórios do CCP original. Cada tipo é uma estratégia (título + filtros + coluna totalizada);
 * novos relatórios entram no mapa sem alterar o método `gerar`.
 */
class RelatorioService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/repositories/TituloRepository')} deps.titulos
   * @param {import('../infrastructure/repositories/FornecedorRepository')} deps.fornecedores
   * @param {import('../infrastructure/repositories/NaturezaRepository')} deps.naturezas
   * @param {import('../infrastructure/repositories/CentroRepository')} deps.centros
   */
  constructor({ titulos, fornecedores, naturezas, centros }) {
    this.titulos = titulos;
    const nome = (repo, id) => repo.findById(id)?.nome || '';
    this.tipos = {
      vencimentos: { titulo: () => 'Títulos a vencer no período', filtro: (q) => ({ status: 'abertos', de: q.de, ate: q.ate, order: 'venc' }) },
      pagamentos: { titulo: () => 'Títulos pagos no período', filtro: (q) => ({ status: 'pagos', pagDe: q.de, pagAte: q.ate, order: 'pag' }) },
      reprogramados: {
        titulo: () => 'Vencimentos reprogramados no período',
        filtro: (q) => ({ status: 'abertos', repDe: q.de || '0001-01-01', repAte: q.ate, order: 'rep' }),
        valor: (t) => t.valre || t.valor,
      },
      fornecedor: { titulo: (q) => `Ficha do fornecedor ${nome(fornecedores, q.id)}`, filtro: (q) => ({ codig: q.id }) },
      natureza: { titulo: (q) => `Ficha da natureza ${nome(naturezas, q.id)}`, filtro: (q) => ({ natur: q.id }) },
      centro: { titulo: (q) => `Ficha do centro de custo ${nome(centros, q.id)}`, filtro: (q) => ({ cc: q.id }) },
      baixas: { titulo: () => 'Geral de baixas', filtro: () => ({ status: 'pagos', order: 'pag' }) },
    };
  }

  gerar(tipo, query = {}) {
    const estrategia = this.tipos[tipo];
    if (!estrategia) throw new NotFoundError('Relatório desconhecido');
    const rows = this.titulos.search(estrategia.filtro(query));
    const valor = estrategia.valor || ((t) => t.valor);
    const total = fromCents(rows.reduce((soma, t) => soma + toCents(valor(t)), 0));
    return { tipo, titulo: estrategia.titulo(query), de: query.de || '', ate: query.ate || '', rows, total };
  }
}

module.exports = RelatorioService;
