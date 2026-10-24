"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { assertPositive } = require("../shared/validators");

const DEFAULT_RECOMMENDED_EARTH_RESISTANCE_OHM = 100;

function calculateEarthResistanceLimit({
  sensitivityMa,
  touchVoltageV = 50,
  recommendedResistanceOhm = DEFAULT_RECOMMENDED_EARTH_RESISTANCE_OHM,
}) {
  assertPositive(sensitivityMa, "sensitivityMa");
  assertPositive(touchVoltageV, "touchVoltageV");
  assertPositive(recommendedResistanceOhm, "recommendedResistanceOhm");

  const sensitivityA = sensitivityMa / 1000;
  return {
    safetyLimitOhm: touchVoltageV / sensitivityA,
    recommendedLimitOhm: recommendedResistanceOhm,
    reference: "CEI 60364-4-41",
  };
}

function verifyEarthResistance({
  earthResistanceOhm,
  sensitivityMa,
  touchVoltageV = 50,
  recommendedResistanceOhm = DEFAULT_RECOMMENDED_EARTH_RESISTANCE_OHM,
}) {
  assertPositive(earthResistanceOhm, "earthResistanceOhm");
  const limits = calculateEarthResistanceLimit({
    sensitivityMa,
    touchVoltageV,
    recommendedResistanceOhm,
  });

  return {
    ...limits,
    measuredResistanceOhm: earthResistanceOhm,
    safetyCompliant: earthResistanceOhm <= limits.safetyLimitOhm,
    meetsRecommendation: earthResistanceOhm <= limits.recommendedLimitOhm,
  };
}

function calculateProtectiveConductorSection(phaseSectionMm2) {
  assertPositive(phaseSectionMm2, "phaseSectionMm2");
  if (phaseSectionMm2 <= 16) return phaseSectionMm2;
  if (phaseSectionMm2 <= 35) return 16;
  return phaseSectionMm2 / 2;
}

function verifyEarthProtection(params) {
  const result = verifyEarthResistance(params);
  if (!result.safetyCompliant) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.GROUND_RESISTANCE_EXCEEDED,
      `La résistance de terre ${result.measuredResistanceOhm} Ω dépasse la limite de sécurité ${result.safetyLimitOhm.toFixed(2)} Ω.`,
      {
        reference: result.reference,
        details: result,
      },
    );
  }
  return result;
}

module.exports = {
  DEFAULT_RECOMMENDED_EARTH_RESISTANCE_OHM,
  calculateEarthResistanceLimit,
  verifyEarthResistance,
  verifyEarthProtection,
  calculateProtectiveConductorSection,
};
