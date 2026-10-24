"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("./normative-error");

function assertPositive(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Valeur invalide pour ${name} : un nombre strictement positif est attendu (reçu ${value}).`,
      { details: { field: name, value } },
    );
  }
}

module.exports = { assertPositive };
