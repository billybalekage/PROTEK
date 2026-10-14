"use strict";

const { ERROR_CODES, NormativeError } = require("../shared/errors/errors");

/**
 * Gestionnaire d'erreurs centralisé (doit être le dernier middleware).
 * Ne divulgue jamais la stack ni les détails internes en production.
 */

module.exports = function errorHandler(err, req, res, next) {
  let statusCode;
  let code;
  let message;
  let details = null;

  if (err instanceof NormativeError) {
    ({ statusCode, message } = ERROR_CODES[err.code]);
    code = err.code;
    details = err.details;
  } else if (err.type === "entity.parse.failed") {
    ({ statusCode, message } = ERROR_CODES.INVALID_JSON);
    code = "INVALID_JSON";
  } else if (err.type === "entity.too.large") {
    ({ statusCode, message } = ERROR_CODES.PAYLOAD_TOO_LARGE);
    code = "PAYLOAD_TOO_LARGE";
  } else {
    statusCode = err.statusCode || err.status || 500;
    code = err.code || "INTERNAL_ERROR";
    message = err.message;
    details = err.details ?? null;

    if (statusCode >= 500 && !err.isOperational) {
      code = "INTERNAL_ERROR";
      message = ERROR_CODES.INTERNAL_ERROR.message;
      statusCode = ERROR_CODES.INTERNAL_ERROR.statusCode;
      details = null;
    } else if (ERROR_CODES[code]) {
      ({ statusCode, message } = ERROR_CODES[code]);
      details = err.details ?? null;
    }
  }

  if (statusCode >= 500) {
    (req.log || require("../../config/logger")).error(
      { err },
      "Erreur serveur",
    );
  }

  const body = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId: req.id,
    },
  };

  res.status(statusCode).json(body);
};
