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
 * Calcul du courant d'emploi (I_b) pour un récepteur ou un groupe de récepteurs.
 * Formules (voir RESIDENTIEL.md) :
 *  - Monophasé : I_b = (P * k_u * k_s) / (U * cosφ)
 *  - Triphasé   : I_b = (P * k_u * k_s) / (√3 * U_L * cosφ)
 *
 * Entrées :
 *  - powerW (W) : puissance installée
 *  - voltageV (V) : tension (230 pour monophasé, 400 pour triphasé ligne à ligne)
 *  - phases : 1 ou 3
 *  - cosPhi : facteur de puissance (0 < cosPhi <= 1)
 *  - utilisationFacteur (k_u) : 0 < k_u <= 1
 *  - simultaneityFactor (k_s) : 0 < k_s <= 1
 *
 * Retour : I_b en ampères (nombre à virgule, précision 1e-6)
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

  if (
    cosPhi <= 0 ||
    cosPhi > 1 ||
    utilisationFacteur <= 0 ||
    utilisationFacteur > 1 ||
    simultaneityFactor <= 0 ||
    simultaneityFactor > 1
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "cosPhi, utilisationFacteur et simultaneityFactor doivent être dans l’intervalle (0, 1].",
      { details: { cosPhi, utilisationFacteur, simultaneityFactor } },
    );
  }

  const effectivePower = powerW * utilisationFacteur * simultaneityFactor;
  const divisor = (phases === 3 ? Math.sqrt(3) : 1) * voltageV * cosPhi;
  const ib = effectivePower / divisor;

  // Retourner valeur arrondie proprement pour éviter des flottants inutiles
  return Math.round(ib * 1e6) / 1e6;
}

module.exports = { calculateDesignCurrent, assertPositive };
