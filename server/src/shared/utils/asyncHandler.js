"use strict";

/**
 * Enveloppe un handler async (controller ou middleware) et transmet
 * toute erreur ou promesse rejetée au errorHandler central via next(err).
 *
 * @param {(req, res, next) => Promise<any>} fn
 * @returns {(req, res, next) => void}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
