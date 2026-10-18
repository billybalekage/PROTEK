"use strict";

const { PrismaClient } = require("@prisma/client");
const { env } = require("./env");
const logger = require("./logger");

const dbLogger = logger.child({ module: "database" });

/**
 * Client Prisma unique (singleton) pour toute l'application.
 * Les logs Prisma sont redirigés vers pino.
 */
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
    ...(env.isProd ? [] : [{ emit: "event", level: "query" }]),
  ],
});

prisma.$on("warn", (e) => dbLogger.warn(e.message));
prisma.$on("error", (e) => dbLogger.error(e.message));
if (!env.isProd) {
  prisma.$on("query", (e) => {
    // Seules les requêtes lentes (> 200 ms) sont signalées
    if (e.duration > 200)
      dbLogger.warn(
        { durationMs: e.duration, query: e.query },
        "Requête lente",
      );
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Vérifie la connexion à PostgreSQL, avec nouvelles tentatives
 * (réseau/DB instable au démarrage). Lève une erreur si toutes échouent.
 */
async function connectDatabase() {
  const { connectRetries, connectRetryDelayMs } = env.db;

  for (let attempt = 1; attempt <= connectRetries; attempt += 1) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      dbLogger.info("Connexion a la base de donnees etablie.");
      return;
    } catch (err) {
      const isLast = attempt === connectRetries;
      dbLogger.warn(
        {
          err: { message: err.message, code: err.code },
          attempt,
          max: connectRetries,
        },
        "Connexion à la base de données impossible",
      );
      if (isLast) {
        const error = new Error(
          `Base de données injoignable après ${connectRetries} tentatives. Vérifiez DATABASE_URL et que PostgreSQL est démarré.`,
        );
        error.cause = err;
        throw error;
      }
      await sleep(connectRetryDelayMs * attempt); // délai progressif
    }
  }
}

/** Test de santé rapide (readiness). Retourne true/false, ne lève jamais. */
async function isDatabaseHealthy() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    dbLogger.error({ err }, "Health check DB en échec");
    return false;
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  dbLogger.info("Connexion à la base de données fermée.");
}

module.exports = {
  prisma,
  connectDatabase,
  isDatabaseHealthy,
  disconnectDatabase,
};
