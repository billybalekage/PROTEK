"use strict";

class AppError extends Error {
  /**
   * @param {String} message Message clair destiné a l'utilisateur
   * @param {object} options
   * @param {number} options.statusCode  code HTTP
   * @param {String} options.code        code machine stable (INVALID_CREDENTIALS)
   * @param {object} [options.details]   Informations complementaire 
   */

  constructor(message, {statusCode = 500, code = 'INTENAL_ERROR', details} = {}) {
    super(message)
    this.name = this.contructor.name;
    this.statusCode = statusCode
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.contructor)
  }
}

module.exports = AppError