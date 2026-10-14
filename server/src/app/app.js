"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { env } = require("../config/env");
const { OperationalError } = require("../shared/errors/errors");
const requestId = require("../middlewares/requestId");
const notFound = require("../middlewares/notFound");
const errorHandler = require("../middlewares/errorHandler");
const httpLogger = require("../middlewares/httpLogger");
const { isDatabaseHealthy } = require("../config/db");
const swaggerRouter = require("../config/swaggerUi");
const apiRouter = require("./apiRouter");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.trustProxy);

app.use(requestId);
app.use(httpLogger);

// Documentation API
if (env.swaggerEnabled) {
  app.use("/api", swaggerRouter);
}

app.use(helmet());
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(new OperationalError("TOO_MANY_REQUESTS")),
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Autorise les clients sans origine (apps mobiles/desktop, curl, health checks)
      if (!origin || env.corsOrigins.includes(origin))
        return callback(null, true);
      return callback(new OperationalError("CORS_NOT_ALLOWED"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  }),
);

app.use(compression());
app.use(express.json({ limit: env.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));
app.use(cookieParser());
app.use(hpp()); // protection contre la pollution des paramètres HTTP

app.use((req, res, next) => {
  if (app.locals.shuttingDown) res.setHeader("Connection", "close");
  next();
});

app.use("/api/v1", apiRouter); // Sentralisation des routes

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", async (req, res) => {
  const dbOk = await isDatabaseHealthy();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "ready" : "unavailable",
    checks: { database: dbOk ? "up" : "down" },
    timestamp: new Date().toISOString(),
  });
});

if (!env.isProd) {
  app.get(
    "/_debug/async-error",
    require("../shared/utils/asyncHandler")(async () => {
      throw new Error("Test asyncHandler");
    }),
  );
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
