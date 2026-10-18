"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");

/**
 * Vérifie qu'une valeur est strictement positive.
 * Lance NormativeError en cas d'entrée invalide.
 */
function assertPositive(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Valeur invalide pour ${name} : un nombre strictement positif est attendu (reçu ${value}).`,
      { details: { field: name, value } },
    );
  }
}

/**
 * Calcul du courant d'emploi (I_b) pour un récepteur ou un groupe résidentiel.
 * Formules de RESIDENTIEL.md :
 *  - Monophasé : I_b = (P * k_u * k_s) / (U * cosφ)
 *  - Triphasé   : I_b = (P * k_u * k_s) / (√3 * U_L * cosφ)
 *
 * P est exprimée en watts, U en volts, et le résultat en ampères.
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
  const current = effectivePower / divisor;

  return Math.round(current * 1e6) / 1e6;
}

module.exports = { calculateDesignCurrent, assertPositive };
