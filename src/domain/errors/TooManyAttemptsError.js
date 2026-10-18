'use strict';
const AppError = require('./AppError');

class TooManyAttemptsError extends AppError {
  constructor(message = 'Número de tentativas esgotado. ACESSO NEGADO. Aguarde 5 minutos.') {
    super(message, 429);
  }
}

module.exports = TooManyAttemptsError;
