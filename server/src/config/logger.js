"use strict";

const pino = require("pino");
const { env } = require("./env");

/**
 * Logger applicatif unique (pino).
 * - Développement : sortie lisible via pino-pretty
 * - Production    : JSON brut sur stdout (collecté par Docker / PM2 / agrégateur)
 */
const logger = pino({
  level: env.isTest ? "silent" : env.logLevel,
  base: { service: "proteck-api", env: env.nodeEnv },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Données sensibles : jamais écrites dans les logs
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.token",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },
  ...(env.isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname,service,env",
          },
        },
      }),
});

module.exports = logger;
