"use strict";

// Calcul de la chute de tension (fonctions pures)
// Formules basiques issues des principes NF C 15-100 / CEI 60364 (approximation ohmique+réactive)

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const {
  COPPER_RESISTIVITY_OHM_MM2_PER_M,
  CABLE_REACTANCE_OHM_PER_M,
  REACTANCE_THRESHOLD_MM2,
  VOLTAGE_DROP_LIMITS_PERCENT,
  MINIMAL_PHASE_VOLTAGE_V,
} = require("./constants");

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
 * Calcule la résistance ohmique d'un conducteur cuivre sur la longueur donnée.
 * R (ohm) = ρ * L / S, avec ρ en ohm·mm²/m, L en m, S en mm²
 */
function conductorResistanceOhm(lengthM, sectionMm2) {
  return (COPPER_RESISTIVITY_OHM_MM2_PER_M * lengthM) / sectionMm2;
}

/**
 * Estimation de la réactance sur la ligne (approximation en ohm par m).
 * Pour les très grandes sections, la composante réactive est négligeable.
 */
function conductorReactanceOhm(lengthM, sectionMm2) {
  if (sectionMm2 >= REACTANCE_THRESHOLD_MM2) return 0;
  return CABLE_REACTANCE_OHM_PER_M * lengthM;
}

/**
 * Calcule la chute de tension absolue (V) et en pourcentage (%) pour un circuit.
 * - ibA : courant d'emploi (A)
 * - lengthM : longueur aller simple (m). Pour monophasé on multiplie par 2 dans la formule (phase+neutre).
 * - sectionMm2 : section du conducteur (mm²)
 * - phases : 1 ou 3
 * - cosPhi : facteur de puissance (0..1)
 * - voltageV : tension de référence (230V monophasé, 400V triphasé ligne à ligne)
 *
 * Formule utilisée (approximation) :
 *  ΔU (V) = I * (R * cosφ + X * sinφ) * k
 *  - k = 2 pour monophasé (aller-retour), k = √3 pour triphasé (ligne à ligne)
 *  ΔU% = (ΔU / U) * 100
 */
function calculateVoltageDropPercent({
  ibA,
  lengthM,
  sectionMm2,
  phases = 1,
  cosPhi = 1,
  voltageV,
}) {
  assertPositive(ibA, "ibA");
  assertPositive(lengthM, "lengthM");
  assertPositive(sectionMm2, "sectionMm2");

  if (phases !== 1 && phases !== 3) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "Le nombre de phases doit être 1 ou 3.",
      { details: { phases } },
    );
  }

  if (
    typeof cosPhi !== "number" ||
    !Number.isFinite(cosPhi) ||
    cosPhi <= 0 ||
    cosPhi > 1
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "cosPhi doit être dans l’intervalle (0, 1].",
      { details: { field: "cosPhi", value: cosPhi } },
    );
  }

  const referenceVoltageV =
    voltageV === undefined
      ? phases === 3
        ? 400
        : MINIMAL_PHASE_VOLTAGE_V
      : voltageV;
  assertPositive(referenceVoltageV, "voltageV");

  // Calcul des impédances élémentaires
  const R = conductorResistanceOhm(lengthM, sectionMm2);
  const X = conductorReactanceOhm(lengthM, sectionMm2);

  const phi = Math.acos(Math.max(-1, Math.min(1, cosPhi)));
  const k = phases === 1 ? 2 : Math.sqrt(3);

  const deltaV = ibA * (R * Math.cos(phi) + X * Math.sin(phi)) * k;
  const percent = (deltaV / referenceVoltageV) * 100;

  return {
    deltaV: Math.round(deltaV * 1e6) / 1e6,
    percent: Math.round(percent * 1e6) / 1e6,
    components: { R: Math.round(R * 1e9) / 1e9, X: Math.round(X * 1e9) / 1e9 },
  };
}

/**
 * Vérifie qu'une chute de tension respecte la limite normative selon la catégorie du circuit.
 * - circuitType : 'lighting' (éclairage) ou 'other' (force motrice / prises)
 * Lance NormativeError(VOLTAGE_DROP_EXCEEDED) si la contrainte n'est pas respectée.
 */
function validateVoltageDrop({
  ibA,
  lengthM,
  sectionMm2,
  phases = 1,
  cosPhi = 1,
  voltageV,
  circuitType = "other",
}) {
  const res = calculateVoltageDropPercent({
    ibA,
    lengthM,
    sectionMm2,
    phases,
    cosPhi,
    voltageV,
  });
  const limit = VOLTAGE_DROP_LIMITS_PERCENT[circuitType];
  if (limit === undefined) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Type de circuit non pris en charge : ${circuitType}.`,
      { details: { field: "circuitType", value: circuitType } },
    );
  }

  if (res.percent > limit) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.VOLTAGE_DROP_EXCEEDED,
      `La chute de tension (${res.percent.toFixed(3)}%) dépasse la limite de ${limit}% pour le type de circuit '${circuitType}'.`,
      {
        details: {
          measuredPercent: res.percent,
          maximumPercent: limit,
          ibA,
          lengthM,
          sectionMm2,
          phases,
          cosPhi,
        },
      },
    );
  }

  return res;
}

module.exports = {
  conductorResistanceOhm,
  conductorReactanceOhm,
  calculateVoltageDropPercent,
  validateVoltageDrop,
};
