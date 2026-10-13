"use strict";

const http = require("http");
const { env } = require("./src/config/env");
const logger = require("./src/config/logger");
const { connectDatabase, disconnectDatabase } = require("./src/config/db");
const app = require("./src/app/app");

const server = http.createServer(app);

// Timeouts HTTP (protection contre connexions lentes, utile sur réseaux instables)
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;
server.requestTimeout = 60 * 1000;

// --- Arrêt propre -------------------------------------------------------
let shuttingDown = false;

const FORCE_CLOSE_CONNECTIONS_MS = 8 * 1000; // coupe les requêtes encore actives
const FORCE_EXIT_MS = 10 * 1000;             // arrêt du process en dernier recours

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.locals.shuttingDown = true;
  logger.info(`Arrêt en cours (${reason})...`);

  // Dernier recours : arrêt forcé du process
  const forceExit = setTimeout(() => {
    logger.fatal("Arrêt forcé (délai dépassé).");
    process.exit(1);
  }, FORCE_EXIT_MS);
  forceExit.unref();

  const closeResources = async (err) => {
    try {
      await disconnectDatabase();
      if (err) throw err;
      logger.info("Serveur arrêté proprement.");
      process.exit(exitCode);
    } catch (e) {
      logger.fatal({ err: e }, "Erreur pendant l'arrêt");
      process.exit(1);
    }
  };

  if (!server.listening) {
    closeResources();
    return;
  }

  server.close(closeResources);

  server.closeIdleConnections();

  const forceConnections = setTimeout(() => {
    logger.warn("Fermeture forcée des connexions encore actives.");
    server.closeAllConnections();
  }, FORCE_CLOSE_CONNECTIONS_MS);
  forceConnections.unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandledRejection");
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  shutdown("uncaughtException", 1);
});

// --- Démarrage ----------------------------------------------------------
async function bootstrap() {
  try {
    await connectDatabase(); // bloque le démarrage si la DB est injoignable

    server.listen(env.port, env.host, () => {
      logger.info(
        `API demare sur http://${env.host}:${env.port} (${env.nodeEnv})`,
      );
    });
  } catch (err) {
    logger.fatal({ err }, "Échec du démarrage du serveur");
    shutdown("startup failure", 1);
  }
}

bootstrap();