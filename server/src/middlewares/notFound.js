"use strict";

const AppError = require("../shared/errors/AppError");

module.exports = function notFound(req, res, next) {
  next(
    new AppError(
      `Route introuvable : ${req.method} ${req.originalUrl}`,
      404,
      "ROUTE_NOT_FOUND",
    ),
  );
};
