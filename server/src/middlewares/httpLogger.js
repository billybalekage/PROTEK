"use strict";

const pinoHttp = require("pino-http");
const logger = require("../config/logger");

/**
 * Journalisation HTTP : une entrée par requête, corrélée par req.id.
 * Doit être placé APRÈS requestId.
 */
module.exports = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  autoLogging: {
    ignore: (req) =>
      req.url === "/health" ||
      req.url === "/ready" ||
      req.url.startsWith("/api/docs"),
  },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  // Réduit le bruit : seulement l'essentiel de la requête/réponse
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
