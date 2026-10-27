"use strict";

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const API_PREFIX = process.env.API_PREFIX || "/api/v1";
const refreshTtlDays = process.env.REFRESH_TTL_DAYS || process.env.REFRESH_TTL_DAY;
const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const otpHmacSecret = process.env.OTP_HMAC_SECRET;

if (
  otpHmacSecret &&
  (otpHmacSecret.length < 32 || otpHmacSecret === accessSecret)
) {
  throw new Error(
    "OTP_HMAC_SECRET doit contenir au moins 32 caractères et être distinct du secret JWT.",
  );
}
if (process.env.NODE_ENV === "production" && !otpHmacSecret) {
  throw new Error("OTP_HMAC_SECRET est requis en production.");
}

module.exports = Object.freeze({
  jwt: {
    accessSecret,
    issuer: process.env.JWT_ISSUER || "protek_apis",
    audience: process.env.JWT_AUDIENCE || "protek_clients",
    accessTtlSeconds: toInt(process.env.JWT_TTL_SECONDS, 15 * 60),
  },
  refreshToken: {
    ttlMs: toInt(refreshTtlDays, 30) * DAY,
    bytes: 48,
    reuseGraceMs: toInt(process.env.REFRESH_REUSE_GRACE_MS, 10 * 1000),
    revokeAllSessionsOnReuse:
      process.env.REFRESH_REVOKE_ALL_ON_REUSE === "true",
  },
  password: {
    bcryptRounds: toInt(
      process.env.BCRYPT_ROUNDS || process.env.BCRYPTROUNDS,
      12,
    ),
    minLength: 10,
    maxLength: 72,
  },
  otp: {
    length: 6,
    ttlMs: 10 * MINUTE,
    maxAttempts: 5,
    resendCooldownMs: MINUTE,
    maxPerHour: 5,
    hmacSecret: otpHmacSecret,
  },
  captcha: {
    driver: process.env.CAPTCHA_DRIVER || "none",
    secret: process.env.CAPTCHA_SECRET,
    verifyUrl:
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    timeoutMs: 5000,
  },
  cookie: {
    name: "protek_rt",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAMESITE || "strict",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: `${API_PREFIX}/auth`,
  },
  rateLimit: {
    global: { windowMs: 15 * MINUTE, limit: 600 },
    signup: { windowMs: HOUR, limit: 10 },
    login: { windowMs: 15 * MINUTE, limit: 10 },
    loginIp: { windowMs: 15 * MINUTE, limit: 100 },
    otpSend: { windowMs: 15 * MINUTE, limit: 5 },
    otpAttempt: { windowMs: 15 * MINUTE, limit: 10 },
    refresh: { windowMs: 15 * MINUTE, limit: 60 },
    authed: { windowMs: 15 * MINUTE, limit: 30 },
  },
  invitation: {
    ttlMs: 48 * HOUR,
    bytes: 32,
  },
  lockout: {
    captchaAfterFailures: 3,
    criticalFailures: 5,
    levelsMs: [15 * MINUTE, HOUR, 24 * HOUR],
    resetFailuresAfterMs: 30 * MINUTE,
  },
});