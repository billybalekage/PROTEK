"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { OperationalError } = require("../shared/errors/errors");

module.exports = function authenticate(req, res, next) {
  const authorization = req.get("authorization");
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return next(new OperationalError("UNAUTHORIZED"));
  }

  let payload;
  try {
    payload = jwt.verify(match[1], env.jwt.secret, {
      algorithms: ["HS256"],
    });
  } catch {
    return next(new OperationalError("UNAUTHORIZED"));
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.sub !== "string" ||
    payload.sub.trim().length === 0
  ) {
    return next(new OperationalError("UNAUTHORIZED"));
  }

  req.user = {
    id: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
  };
  return next();
};
