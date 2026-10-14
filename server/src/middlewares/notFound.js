"use strict";

const { OperationalError } = require("../shared/errors/errors");

module.exports = function notFound(req, res, next) {
  next(
    new OperationalError("ROUTE_NOT_FOUND", {
      method: req.method,
      path: req.originalUrl,
    }),
  );
};
