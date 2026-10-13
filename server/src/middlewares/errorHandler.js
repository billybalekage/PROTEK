"use strict";

/**
 * Gestionnaire d'erreurs centralisé (doit être le dernier middleware).
 * Ne divulgue jamais la stack ni les détails internes en production.
 */

module.exports = function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message;

  // JSON invalide
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Corps de requête JSON invalide.";
  }
  // Corps trop volumineux
  if (err.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Corps de requête trop volumineux.";
  }
  // CORS refusé
  if (err.code === "CORS_NOT_ALLOWED") {
    statusCode = 403;
  }

  const isOperational = err.isOperational === true || statusCode < 500;

  if (!isOperational) {
    (req.log || require("../../config/logger")).error(
      { err },
      "Erreur non gérée",
    );
    message = "Erreur interne du serveur.";
    code = "INTERNAL_ERROR";
    statusCode = 500;
  } else if (statusCode >= 500) {
    (req.log || require("../../config/logger")).error({ err }, err.message);
  }

  const body = {
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.id,
    },
  };

  res.status(statusCode).json(body);
};
