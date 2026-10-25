"use strict";

const logger = require("../config/logger");
const { ERROR_CODES, NormativeError } = require("../shared/errors/errors");

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode;
  let code;
  let message;
  let details = null;

  if (
    err instanceof NormativeError ||
    (err && err.name === "NormativeError")
  ) {
    const definition = ERROR_CODES[err.code];
    if (definition) {
      statusCode = definition.statusCode;
      message = err.message || definition.message;
      code = err.code;
      details = err.details ?? null;
      if (err.reference) {
        details = { ...(details || {}), reference: err.reference };
      }
    } else {
      ({ statusCode, message } = ERROR_CODES.INTERNAL_ERROR);
      code = "INTERNAL_ERROR";
      details = null;
      err = new Error(ERROR_CODES.INTERNAL_ERROR.message, { cause: err });
    }
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
    (req.log || logger).error({ err }, "Erreur serveur");
  }
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
      requestId: req.id,
    },
  });
};