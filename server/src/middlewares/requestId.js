"use strict";

const crypto = require("crypto");

/** Attache un identifiant unique à chaque requête (traçabilité / audit log). */
module.exports = function requestId(req, res, next) {
  const incoming = req.get("x-request-id");
  req.id = incoming && incoming.length <= 100 ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};
