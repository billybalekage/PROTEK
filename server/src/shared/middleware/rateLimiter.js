"use strict";

const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { RateLimitError } = require("../errors/http.errors");

const normalizedEmail = (req) =>
  String(req.body?.email || "")
    .trim()
    .toLowerCase();

const keyByIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";
const keyByIpAndEmail = (req) =>
  `${keyByIp(req)}:${crypto
    .createHash("sha256")
    .update(normalizedEmail(req))
    .digest("hex")}`;
const keyByUser = (req) =>
  req.auth?.userId ? `user:${req.auth.userId}` : keyByIp(req);

const createLimiter = ({ windowMs, limit, keyGenerator = keyByIp }) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) =>
      process.env.NODE_ENV === "test" &&
      process.env.RATE_LIMIT_DISABLED === "true",
    handler: (req, _res, next) => {
      const reset = req.rateLimit?.resetTime;
      const retryAfterSeconds = reset
        ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000))
        : 60;
      return next(new RateLimitError(retryAfterSeconds));
    },
  });

module.exports = { createLimiter, keyByIp, keyByIpAndEmail, keyByUser };
