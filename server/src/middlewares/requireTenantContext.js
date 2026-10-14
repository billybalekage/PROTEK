"use strict";

const { OperationalError } = require("../shared/errors/errors");

/**
 * À monter après un middleware d'authentification qui vérifie le jeton
 * et place l'identité authentifiée dans req.user.
 */
module.exports = function requireTenantContext(req, res, next) {
  if (!req.user) {
    return next(new OperationalError("UNAUTHORIZED"));
  }

  const tenantId = req.user.tenantId;
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    return next(new OperationalError("TENANT_CONTEXT_REQUIRED"));
  }

  req.tenantId = tenantId;
  return next();
};
