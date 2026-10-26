const AppError = require('./AppError');

class ValidationError extends AppError {
  /** @param {{ field: string|null, message: string }[]} details */
  
  constructor(details) {
    super('Les données envoyées sont invalides.', {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      details,
    });
  }
}

module.exports = ValidationError;