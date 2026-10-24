"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { assertPositive } = require("../shared/validators");

function adjustDesignCurrentForLowVoltage({
  ibA,
  nominalVoltageV,
  minimumVoltageV,
  enabled = true,
}) {
  assertPositive(ibA, "ibA");
  assertPositive(nominalVoltageV, "nominalVoltageV");
  assertPositive(minimumVoltageV, "minimumVoltageV");
  if (typeof enabled !== "boolean") {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "Le paramètre d'adaptation réseau doit être booléen.",
      { details: { field: "enabled", value: enabled } },
    );
  }
  if (minimumVoltageV > nominalVoltageV) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "La tension minimale ne peut pas dépasser la tension nominale.",
      {
        details: { nominalVoltageV, minimumVoltageV },
      },
    );
  }

  const adjustedIbA = enabled ? ibA * (nominalVoltageV / minimumVoltageV) : ibA;
  return {
    ibA: adjustedIbA,
    nominalVoltageV,
    minimumVoltageV,
    adjustmentEnabled: enabled,
    recommendVoltageRelay: enabled && minimumVoltageV < nominalVoltageV,
  };
}

module.exports = { adjustDesignCurrentForLowVoltage };
