'use strict';
const NotFoundError = require('../../domain/errors/NotFoundError');
const ValidationError = require('../../domain/errors/ValidationError');
const { key, isBlank } = require('./importHelpers');

const MAX_ROWS = 5000;
const MAX_REPORTED_ERRORS = 50;
const SAMPLE_SIZE = 5;

/**
 * Importação de dados por CSV. Fluxo: (1) o usuário baixa o modelo da tela; (2) envia o arquivo preenchido para
 * uma validação sem gravar (`confirmar: false`), que devolve contagens, amostra e erros por linha; (3) confirma
 * a importação, que é "tudo ou nada" (transação) e fica registrada na auditoria.
 */
class CsvImportService {
  /**
   * @param {object} deps
   * @param {Record<string, object>} deps.importers mapa entidade -> importador (columns, begin, parse, commit)
   * @param {import('../../infrastructure/csv/CsvParser')} deps.parser
   * @param {import('../../infrastructure/csv/CsvWriter')} deps.csvWriter
   * @param {(work: () => any) => any} deps.transaction executa `work` numa transação do banco
   * @param {import('../AuditTrail')} deps.audit
   */
  constructor({ importers, parser, csvWriter, transaction, audit }) {
    this.importers = importers;
    this.parser = parser;
    this.csvWriter = csvWriter;
    this.transaction = transaction;
    this.audit = audit;
  }

  /** Modelo de CSV (cabeçalho + uma linha de exemplo) da tela. @returns {{filename:string, csv:string}} */
  template(entity) {
    const importer = this.#importer(entity);
    const columns = importer.columns.map((c) => ({ header: c.header, value: () => c.example, type: 'text' }));
    return { filename: `modelo-importacao-${entity}.csv`, csv: this.csvWriter.build(columns, [{}]) };
  }

  /** Colunas do modelo, para a tela explicar o que preencher. */
  describe(entity) {
    const importer = this.#importer(entity);
    return { entidade: entity, titulo: importer.label, colunas: importer.columns.map(({ header, required }) => ({ header, obrigatoria: !!required })) };
  }

  /**
   * @param {string} entity
   * @param {string} csv conteúdo do arquivo
   * @param {{actor: object, confirmar?: boolean}} options
   */
  run(entity, csv, { actor, confirmar = false }) {
    const importer = this.#importer(entity);
    const parsed = this.#parse(importer, csv);
    const { records, summaries, errors } = this.#validate(importer, parsed);

    const result = {
      entidade: entity,
      total: parsed.rows.length,
      validos: records.length,
      totalErros: errors.length,
      erros: errors.slice(0, MAX_REPORTED_ERRORS),
      amostra: summaries.slice(0, SAMPLE_SIZE),
      importados: 0,
    };
    if (!confirmar) return result;

    if (errors.length) throw new ValidationError(`Há ${errors.length} linha(s) com erro. Corrija o arquivo e envie novamente: nada foi importado.`);
    if (!records.length) throw new ValidationError('O arquivo não possui linhas para importar.');
    this.transaction(() => importer.commit(records));
    this.audit.record({
      actor, acao: 'importar', entidade: importer.auditEntity, descricao: `Importação CSV de ${importer.label.toLowerCase()}: ${records.length} registro(s) incluído(s)`,
      depois: { quantidade: records.length, amostra: summaries.slice(0, SAMPLE_SIZE) },
    });
    return { ...result, importados: records.length };
  }

  #importer(entity) {
    const importer = this.importers[entity];
    if (!importer) throw new NotFoundError('Importação não disponível para esta tela');
    return importer;
  }

  /** Lê o CSV e mapeia cada coluna do modelo (pelo nome ou apelido) para o índice da planilha. */
  #parse(importer, csv) {
    const lines = this.parser.parse(csv);
    if (lines.length < 2) throw new ValidationError('O arquivo está vazio ou só tem o cabeçalho.');
    const [header, ...rows] = lines;
    if (rows.length > MAX_ROWS) throw new ValidationError(`O arquivo tem ${rows.length} linhas; o máximo por importação é ${MAX_ROWS}.`);

    const headerKeys = header.map(key);
    const indexes = new Map();
    for (const column of importer.columns) {
      const names = [column.header, ...(column.aliases || [])].map(key);
      const index = headerKeys.findIndex((h) => names.includes(h));
      if (index >= 0) indexes.set(column.header, index);
      else if (column.required) throw new ValidationError(`Coluna obrigatória ausente no arquivo: "${column.header}". Use o modelo da tela.`);
    }
    return { indexes, rows, firstLine: 2 };
  }

  #validate(importer, { indexes, rows, firstLine }) {
    const context = importer.begin();
    const records = [];
    const summaries = [];
    const errors = [];
    rows.forEach((cells, i) => {
      const row = Object.fromEntries(importer.columns.map((c) => [c.header, indexes.has(c.header) ? cells[indexes.get(c.header)] ?? '' : '']));
      if (importer.columns.every((c) => isBlank(row[c.header]))) return;
      try {
        const { record, summary } = importer.parse(row, context);
        records.push(record);
        summaries.push(summary);
      } catch (error) {
        if (!(error.status && error.status < 500)) throw error;
        errors.push({ linha: firstLine + i, mensagem: error.message });
      }
    });
    return { records, summaries, errors };
  }
}

module.exports = CsvImportService;
