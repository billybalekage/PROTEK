"use strict";

// Sélection et dimensionnement des DDR (fonctions pures)
// Respecte les règles décrites dans RESIDENTIEL.md

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const {
  DDR_SENSITIVITIES_MA,
  DDR_STANDARD_RATTINGS_A,
} = require("./constants");

function assertCircuits(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "circuits doit être un tableau non vide.",
      { details: { field: "circuits" } },
    );
  }

  value.forEach((circuit, index) => {
    if (!circuit || typeof circuit !== "object" || Array.isArray(circuit)) {
      throw new NormativeError(
        NORMATIVE_ERROR_CODES.INVALID_INPUT,
        "Chaque circuit doit être un objet.",
        { details: { field: `circuits[${index}]`, value: circuit } },
      );
    }

    if (
      circuit.sensitivityMa !== undefined &&
      (typeof circuit.sensitivityMa !== "number" ||
        !Number.isFinite(circuit.sensitivityMa) ||
        circuit.sensitivityMa <= 0)
    ) {
      throw new NormativeError(
        NORMATIVE_ERROR_CODES.INVALID_INPUT,
        "La sensibilité demandée doit être un nombre positif en mA.",
        {
          details: {
            field: `circuits[${index}].sensitivityMa`,
            value: circuit.sensitivityMa,
          },
        },
      );
    }
  });
}

/**
 * Détermine la sensibilité la plus stricte (valeur minimale en mA) requise
 * par un ensemble de circuits. En résidentiel la valeur minimale légale est 30 mA.
 *
 * circuits : [{ ibA, sensitivityMa?, hasElectronicLoad? }, ...]
 */
function determineSensitivity(circuits) {
  assertCircuits(circuits);

  const provided = circuits
    .map((c) => (typeof c.sensitivityMa === "number" ? c.sensitivityMa : null))
    .filter((v) => v !== null);

  // La sensibilité la plus stricte (plus petite valeur) l'emporte.
  // En habitation, le défaut de configuration reste 30 mA pour la protection des personnes.
  return provided.length
    ? Math.min(...provided)
    : Math.min(...DDR_SENSITIVITIES_MA);
}

/**
 * Détermine le type de DDR : 'A' si au moins un circuit a de l'électronique de puissance,
 * sinon 'AC' par défaut. (Simplification conforme à la spécification RESIDENTIEL.md)
 */
function determineType(circuits) {
  assertCircuits(circuits);
  return circuits.some((c) => c.hasElectronicLoad) ? "A" : "AC";
}

/**
 * Sélectionne le calibre normalisé du DDR (ou disjoncteur) à partir du courant total I_b somme.
 * Arrondit au calibre standard immédiatement supérieur.
 */
function selectStandardRating(totalIb) {
  if (
    typeof totalIb !== "number" ||
    !Number.isFinite(totalIb) ||
    totalIb <= 0
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "totalIb doit être un nombre positif.",
      { details: { totalIb } },
    );
  }

  const sorted = DDR_STANDARD_RATTINGS_A.slice().sort((a, b) => a - b);
  for (const r of sorted) {
    if (r >= totalIb) return r;
  }

  // Aucun calibre normalisé disponible (rare) -> erreur normative
  throw new NormativeError(
    NORMATIVE_ERROR_CODES.DDR_CAPACITY_EXCEEDED,
    `Le courant total I_b = ${totalIb} A dépasse les calibres DDR standard disponibles.`,
    { details: { totalIb, maxAvailable: sorted[sorted.length - 1] } },
  );
}

/**
 * API principale : calcule la configuration DDR pour un groupe de circuits.
 * Entrée : circuits = [ { ibA, sensitivityMa?, hasElectronicLoad? }, ... ]
 * Retour : { sensitivityMa, type, ratingA, totalIb }
 */
function designDDRForGroup(circuits) {
  assertCircuits(circuits);

  const totalIb = circuits.reduce((acc, c) => {
    const ib = c.ibA;
    if (typeof ib !== "number" || !Number.isFinite(ib) || ib <= 0) {
      throw new NormativeError(
        NORMATIVE_ERROR_CODES.INVALID_INPUT,
        "Chaque circuit doit fournir un ibA positif.",
        { details: { circuit: c } },
      );
    }
    return acc + ib;
  }, 0);

  const sensitivityMa = determineSensitivity(circuits);
  const type = determineType(circuits);
  const ratingA = selectStandardRating(totalIb);

  return {
    totalIb: Math.round(totalIb * 1e6) / 1e6,
    sensitivityMa,
    type,
    ratingA,
  };
}

module.exports = {
  determineSensitivity,
  determineType,
  selectStandardRating,
  designDDRForGroup,
};
