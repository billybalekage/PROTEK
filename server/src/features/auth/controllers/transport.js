"use strict";

const { cookie: config } = require("../../../config/auth.config");

const CLIENT_HEADER = "x-protek-client";
const CLIENT_TYPES = new Set(["web", "mobile", "desktop"]);

const getClientType = (req) => {
  const value = String(req.get(CLIENT_HEADER) || "")
    .trim()
    .toLowerCase();
  return CLIENT_TYPES.has(value) ? value : "unknown";
};

const usesCookie = (req) => getClientType(req) === "web";

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.secure,
  sameSite: config.sameSite,
  path: config.path,
  ...(config.domain && { domain: config.domain }),
});

const setRefreshCookie = (res, token, expires) =>
  res.cookie(config.name, token, { ...cookieOptions(), expires });

const clearRefreshCookie = (res) =>
  res.clearCookie(config.name, cookieOptions());

const readRefreshToken = (req) =>
  usesCookie(req) ? req.cookies?.[config.name] : req.body?.refreshToken;

const sendTokens = (req, res, { user, tokens, status = 200 }) => {
  const data = {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    ...(user && { user }),
  };

  if (usesCookie(req)) {
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  } else {
    data.refreshToken = tokens.refreshToken;
    data.refreshTokenExpiresAt = tokens.refreshTokenExpiresAt;
  }
  return res.status(status).json({ data });
};

const requestContext = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

module.exports = {
  getClientType,
  usesCookie,
  readRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  sendTokens,
  requestContext,
};
