'use strict';
const AppError = require('./AppError');

class NotFoundError extends AppError {
  constructor(message = 'Registro não encontrado') {
    super(message, 404);
  }
}

module.exports = NotFoundError;
