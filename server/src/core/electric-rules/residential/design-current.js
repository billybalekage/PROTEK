"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { assertPositive } = require("../shared/validators");

/**
 * Calcul du courant d'emploi (I_b) pour un récepteur ou un groupe résidentiel.
 * Monophasé : I_b = (P × k_u × k_s) / (U × cosφ)
 * Triphasé : I_b = (P × k_u × k_s) / (√3 × U_L × cosφ)
 */
function calculateDesignCurrent({
  powerW,
  voltageV,
  phases = 1,
  cosPhi = 1,
  utilisationFacteur = 1,
  simultaneityFactor = 1,
}) {
  assertPositive(powerW, "powerW");
  assertPositive(voltageV, "voltageV");
  assertPositive(utilisationFacteur, "utilisationFacteur");
  assertPositive(simultaneityFactor, "simultaneityFactor");
  assertPositive(cosPhi, "cosPhi");

  if (phases !== 1 && phases !== 3) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "Le nombre de phases doit être 1 (monophasé) ou 3 (triphasé).",
      { details: { field: "phases", value: phases } },
    );
  }

  if (cosPhi > 1 || utilisationFacteur > 1 || simultaneityFactor > 1) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "cosPhi, utilisationFacteur et simultaneityFactor doivent être dans l’intervalle (0, 1].",
      { details: { cosPhi, utilisationFacteur, simultaneityFactor } },
    );
  }

  const effectivePower = powerW * utilisationFacteur * simultaneityFactor;
  const divisor = (phases === 3 ? Math.sqrt(3) : 1) * voltageV * cosPhi;
  return Math.round((effectivePower / divisor) * 1e6) / 1e6;
}

module.exports = { calculateDesignCurrent };
