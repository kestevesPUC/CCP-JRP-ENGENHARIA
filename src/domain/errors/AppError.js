'use strict';

/** Erro de negócio esperado; carrega o status HTTP correspondente. */
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

module.exports = AppError;
