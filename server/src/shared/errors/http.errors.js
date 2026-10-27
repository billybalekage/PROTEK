"use strict";

const AppError = require("./AppError");

class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable.") {
    super(message, { statusCode: 404, code: "NOT_FOUND" });
  }
}

class RateLimitError extends AppError {
  constructor(retryAfterSeconds) {
    super("Trop de requêtes. Réessayez dans quelques instants.", {
      statusCode: 429,
      code: "RATE_LIMITED",
      details: { retryAfterSeconds },
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

module.exports = { NotFoundError, RateLimitError };
