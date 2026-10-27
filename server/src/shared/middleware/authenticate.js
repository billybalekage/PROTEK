"use strict";

const { TokenInvalidError } = require("../errors/auth.error");
const { authenticateAccessToken } = require("../../features/auth");

const getBearerToken = (req) => {
  const match = req.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
};

const authenticate = async (req, _res, next) => {
  const token = getBearerToken(req);
  if (!token) return next(new TokenInvalidError());

  try {
    req.auth = await authenticateAccessToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
};

const optionalAuthenticate = async (req, _res, next) => {
  req.auth = null;
  const token = getBearerToken(req);
  if (!token) return next();

  try {
    req.auth = await authenticateAccessToken(token);
  } catch (err) {
    if (err instanceof TokenInvalidError) {
      req.auth = null;
      return next();
    }
    return next(err);
  }
  return next();
};

module.exports = { authenticate, optionalAuthenticate };
