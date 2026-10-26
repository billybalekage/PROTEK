"use strict";

const repo = require("../repositories/revokedToken.repository");

module.exports = {
  revoke: (jti, expiresAt) => repo.add(jti, expiresAt),
  isRevoked: (jti) => repo.isRevoked(jti),
  purge: (now) => repo.deleteExpired(now),
};
