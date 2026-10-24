"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { assertPositive } = require("../shared/validators");

const MINIMUM_AMPEREMETRIC_RATIO = 1.6;
const MINIMUM_DIFFERENTIAL_SENSITIVITY_RATIO = 3;

function assessAmperemetricSelectivity({ upstreamRatingA, downstreamRatingA }) {
  assertPositive(upstreamRatingA, "upstreamRatingA");
  assertPositive(downstreamRatingA, "downstreamRatingA");
  const ratio = upstreamRatingA / downstreamRatingA;
  return {
    ratio,
    minimumRatio: MINIMUM_AMPEREMETRIC_RATIO,
    empiricallySelective: ratio >= MINIMUM_AMPEREMETRIC_RATIO,
    guaranteedByManufacturer: false,
    reference: "Règle empirique du projet; confirmation constructeur requise",
  };
}

function verifyDifferentialSelectivity({
  upstreamSensitivityMa,
  downstreamSensitivityMa,
  upstreamType,
  upstreamDelayMs,
}) {
  assertPositive(upstreamSensitivityMa, "upstreamSensitivityMa");
  assertPositive(downstreamSensitivityMa, "downstreamSensitivityMa");
  assertPositive(upstreamDelayMs, "upstreamDelayMs");
  if (upstreamSensitivityMa < MINIMUM_DIFFERENTIAL_SENSITIVITY_RATIO * downstreamSensitivityMa ||
      upstreamType !== "S") {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.DIFFERENTIAL_SELECTIVITY_FAILURE,
      "La sélectivité différentielle requiert un DDR amont de type S, temporisé, avec une sensibilité au moins trois fois supérieure à celle du DDR aval.",
      {
        reference: "CEI 60364-5-53 — coordination à confirmer avec les caractéristiques constructeur",
        details: {
          upstreamSensitivityMa,
          downstreamSensitivityMa,
          upstreamType,
          upstreamDelayMs,
        },
      },
    );
  }
  return {
    selectiveByRule: true,
    guaranteedByManufacturer: false,
    upstreamDelayMs,
  };
}

module.exports = {
  MINIMUM_AMPEREMETRIC_RATIO,
  MINIMUM_DIFFERENTIAL_SENSITIVITY_RATIO,
  assessAmperemetricSelectivity,
  verifyDifferentialSelectivity,
};
