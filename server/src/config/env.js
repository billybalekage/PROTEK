"use strict";

const path = require("path");

/**
 * Chargement et validation des variables d'environnement.
 * Échec immédiat (fail-fast) si la configuration est invalide.
 */
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});
const Joi = require("joi");

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  HOST: Joi.string().default("0.0.0.0"),
  PORT: Joi.number().port().default(5000),
  TRUST_PROXY: Joi.boolean().default(false),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgresql", "postgres"] })
    .required(),

  JWT_SECRET: Joi.string().min(32), //Resolve regex patern() require and more
  JWT_EXPIRES_IN: Joi.string().default("15m"),

  // Liste d'origines séparées
  CORS_ORIGINS: Joi.string().required(),
  BODY_LIMIT: Joi.string().default("1mb"),

  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().positive().default(300),

  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "info", "debug", "trace", "silent")
    .default("info"),

  DB_CONNECT_RETRIES: Joi.number().integer().min(1).max(20).default(5),
  DB_CONNECT_RETRY_DELAY_MS: Joi.number().integer().min(100).default(2000),

  SWAGGER_ENABLED: Joi.boolean().default(false),
  API_PUBLIC_URL: Joi.string().uri().default("http://localhost:5000"),
}).unknown(true); // tolère les variables système

const { value, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  const details = error.details.map((d) => `  - ${d.message}`).join("\n");
  console.error(`[ENV] Configuration invalide :\n${details}`);
  process.exit(1);
}

const env = Object.freeze({
  nodeEnv: value.NODE_ENV,
  isProd: value.NODE_ENV === "production",
  isTest: value.NODE_ENV === "test",
  host: value.HOST,
  port: value.PORT,
  trustProxy: value.TRUST_PROXY,
  databaseUrl: value.DATABASE_URL,
  jwt: Object.freeze({
    secret: value.JWT_SECRET,
    expiresIn: value.JWT_EXPIRES_IN,
  }),
  corsOrigins: value.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  bodyLimit: value.BODY_LIMIT,
  rateLimit: Object.freeze({
    windowMs: value.RATE_LIMIT_WINDOW_MS,
    max: value.RATE_LIMIT_MAX,
  }),
  logLevel: value.LOG_LEVEL,
  swaggerEnabled: value.SWAGGER_ENABLED,
  apiPublicUrl: value.API_PUBLIC_URL,

  db: Object.freeze({
    url: value.DATABASE_URL,
    connectRetries: value.DB_CONNECT_RETRIES,
    connectRetryDelayMs: value.DB_CONNECT_RETRY_DELAY_MS,
  }),
});

module.exports = { env };
