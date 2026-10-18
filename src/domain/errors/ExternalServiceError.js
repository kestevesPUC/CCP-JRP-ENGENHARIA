'use strict';
const AppError = require('./AppError');

/** Falha de um serviço externo (indisponível, limite de consultas...). */
class ExternalServiceError extends AppError {
  constructor(message, status = 502) {
    super(message, status);
  }
}

module.exports = ExternalServiceError;
