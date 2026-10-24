"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { calculateDesignCurrent } = require("./design-current");
const { selectBreakerRating } = require("./overcurrent-protection");
const {
  selectCableSection,
  verifyCableProtection,
} = require("./cable-sizing");
const { adjustDesignCurrentForLowVoltage } = require("./network-stability");

function designCircuit({
  current,
  cable,
  voltageDrop,
  i2A,
  networkStability,
}) {
  if (!current || typeof current !== "object" || !cable || typeof cable !== "object") {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "Le dimensionnement requiert les paramètres de courant et de câble.",
      { details: { fields: ["current", "cable"] } },
    );
  }

  const nominalIbA = calculateDesignCurrent(current);
  const currentResult = networkStability
    ? adjustDesignCurrentForLowVoltage({
        ibA: nominalIbA,
        nominalVoltageV: current.voltageV,
        ...networkStability,
      })
    : {
        ibA: nominalIbA,
        adjustmentEnabled: false,
        recommendVoltageRelay: false,
      };
  const ibA = currentResult.ibA;
  const inA = selectBreakerRating(ibA);
  const sizing = selectCableSection({
    ...cable,
    inA,
    ibA,
    voltageDrop,
  });
  const effectiveI2A = i2A === undefined ? 1.45 * inA : i2A;

  verifyCableProtection({
    ibA,
    inA,
    i2A: effectiveI2A,
    izA: sizing.iz,
  });

  return {
    ibA,
    nominalIbA,
    inA,
    i2A: effectiveI2A,
    networkStability: currentResult,
    ...sizing,
  };
}

module.exports = { designCircuit };
