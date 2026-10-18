'use strict';
const NotFoundError = require('../../domain/errors/NotFoundError');
const ExternalServiceError = require('../../domain/errors/ExternalServiceError');

const BASE_URL = 'https://receitaws.com.br/v1/cnpj';
const TIMEOUT_MS = 10_000;

/** Consulta de CNPJ na ReceitaWS (GET /v1/cnpj/{cnpj}). */
class ReceitaWsGateway {
  /** @param {{fetchImpl?: typeof fetch, baseUrl?: string, timeoutMs?: number}} [options] */
  constructor({ fetchImpl = fetch, baseUrl = BASE_URL, timeoutMs = TIMEOUT_MS } = {}) {
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * @param {string} cnpj somente caracteres alfanuméricos (14)
   * @returns {Promise<object>} resposta bruta da ReceitaWS
   * @throws {NotFoundError|ExternalServiceError}
   */
  async fetchCnpj(cnpj) {
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/${encodeURIComponent(cnpj)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new ExternalServiceError('Não foi possível consultar a Receita agora. Preencha os dados manualmente.');
    }

    const data = await response.json().catch(() => null);
    if (response.status === 429 || /too many|muitas/i.test(data?.message || '')) {
      throw new ExternalServiceError('Limite de consultas da Receita atingido. Aguarde cerca de 1 minuto ou preencha manualmente.', 429);
    }
    if (response.status === 404 || data?.status === 'ERROR') throw new NotFoundError('CNPJ não encontrado na Receita Federal.');
    if (!response.ok || !data) throw new ExternalServiceError('Serviço da Receita indisponível. Preencha os dados manualmente.');
    return data;
  }
}

module.exports = ReceitaWsGateway;
