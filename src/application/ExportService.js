'use strict';
const NotFoundError = require('../domain/errors/NotFoundError');

const text = (header, value) => ({ header, value, type: 'text' });
const money = (header, value) => ({ header, value, type: 'money' });
const date = (header, value) => ({ header, value, type: 'date' });
const int = (header, value) => ({ header, value, type: 'int' });

const TITULO_COLUMNS = [
  int('Código', (t) => t.id), text('Fornecedor', (t) => t.fornecedor), text('Documento', (t) => t.docum), text('Histórico', (t) => t.histo),
  date('Vencimento', (t) => t.dtvec), date('Emissão', (t) => t.dtemi), money('Valor', (t) => t.valor), text('Natureza', (t) => t.natureza),
  text('Local', (t) => t.local), text('Nota fiscal', (t) => t.notaf), date('Reprogramado para', (t) => t.dtrep), money('Valor reprogramado', (t) => t.valre),
  text('Situação', (t) => (t.baixa ? 'PAGO' : 'EM ABERTO')), date('Pagamento', (t) => t.baixa?.dtpag), money('Valor pago', (t) => t.baixa?.receb),
  money('Juros', (t) => t.baixa?.juros), money('Desconto', (t) => t.baixa?.desco), text('Banco', (t) => t.baixa?.banco), int('Nº cheque', (t) => t.baixa?.noche),
  money('Valor do cheque', (t) => t.baixa?.vrche),
  text('Rateio (centro: valor)', (t) => t.rateio.map((r) => `${r.cc}: ${r.valor.toFixed(2).replace('.', ',')}`).join(' | ')),
];

const AUDITORIA_COLUMNS = [
  text('Data/hora', (a) => new Date(a.em).toLocaleString('pt-BR')), text('Usuário', (a) => a.usuario), text('Ação', (a) => a.acao),
  text('Entidade', (a) => a.entidade), int('Código', (a) => a.entidadeId), text('Descrição', (a) => a.descricao),
];

const RELATORIO_COLUMNS = [
  date('Vencimento', (t) => t.dtvec), text('Fornecedor', (t) => t.fornecedor), text('Documento', (t) => t.docum), text('Histórico', (t) => t.histo),
  money('Valor', (t) => t.valor), date('Pagamento', (t) => t.baixa?.dtpag), money('Valor pago', (t) => t.baixa?.receb),
];

/**
 * Exportação CSV de cadastros, títulos e relatórios. Cada entidade declara fonte de dados e colunas,
 * então novas exportações entram no mapa sem mexer na lógica de geração.
 */
class ExportService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/csv/CsvWriter')} deps.csvWriter
   * @param {import('../infrastructure/repositories/TituloRepository')} deps.titulos
   * @param {import('../infrastructure/repositories/FornecedorRepository')} deps.fornecedores
   * @param {import('../infrastructure/repositories/NaturezaRepository')} deps.naturezas
   * @param {import('../infrastructure/repositories/CentroRepository')} deps.centros
   * @param {import('../infrastructure/repositories/AuditRepository')} deps.auditRepository
   */
  constructor({ csvWriter, titulos, fornecedores, naturezas, centros, auditRepository }) {
    this.csvWriter = csvWriter;
    this.entidades = {
      fornecedores: {
        rows: () => fornecedores.findAll(),
        columns: [
          int('Código', (r) => r.id), text('Nome', (r) => r.nome), text('Pessoa', (r) => r.pess), text('CNPJ/CPF', (r) => r.cgc), text('Insc. estadual', (r) => r.insc),
          text('Endereço', (r) => r.ende), text('Bairro', (r) => r.bair), text('Cidade', (r) => r.cida), text('UF', (r) => r.esta), text('CEP', (r) => r.cep),
          text('Fone', (r) => r.fone), text('Fax', (r) => r.fax), text('Contato 1', (r) => r.con1), text('Contato 2', (r) => r.con2), text('Aniversário', (r) => r.nasc),
        ],
      },
      naturezas: { rows: () => naturezas.findAll(), columns: [int('Código', (r) => r.id), text('Descrição', (r) => r.nome)] },
      centros: { rows: () => centros.findAll(), columns: [int('Código', (r) => r.id), text('Descrição', (r) => r.nome)] },
      titulos: { rows: (filters) => titulos.search(filters), columns: TITULO_COLUMNS },
      auditoria: { rows: (filters) => auditRepository.search({ ...filters, limit: 5000 }), columns: AUDITORIA_COLUMNS },
    };
  }

  /** @returns {{filename:string, csv:string}} */
  exportar(entidade, filters = {}) {
    const definicao = this.entidades[entidade];
    if (!definicao) throw new NotFoundError('Exportação desconhecida');
    return { filename: `${entidade}.csv`, csv: this.csvWriter.build(definicao.columns, definicao.rows(filters)) };
  }

  /** @param {{tipo:string, rows:object[]}} relatorio resultado de RelatorioService.gerar */
  exportarRelatorio(relatorio) {
    return { filename: `relatorio-${relatorio.tipo}.csv`, csv: this.csvWriter.build(RELATORIO_COLUMNS, relatorio.rows) };
  }
}

module.exports = ExportService;
