"use strict";

// Sélection et dimensionnement des DDR (fonctions pures)
// Respecte les règles décrites dans RESIDENTIEL.md

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const {
  DDR_SENSITIVITIES_MA,
  DDR_STANDARD_RATINGS_A,
} = require("./constants");

const DDR_TYPES = Object.freeze({
  standard: "AC",
  electronique: "A",
  variateur_mono: "F",
  variateur_tri: "B",
  onduleur_pv: "B",
});

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
      circuit.loadClass !== undefined &&
      !Object.prototype.hasOwnProperty.call(DDR_TYPES, circuit.loadClass)
    ) {
      throw new NormativeError(
        NORMATIVE_ERROR_CODES.INVALID_INPUT,
        `Classe de charge non prise en charge : ${circuit.loadClass}.`,
        {
          details: {
            field: `circuits[${index}].loadClass`,
            value: circuit.loadClass,
          },
        },
      );
    }

    if (
      circuit.sensitivityMa !== undefined &&
      !DDR_SENSITIVITIES_MA.includes(circuit.sensitivityMa)
    ) {
      throw new NormativeError(
        NORMATIVE_ERROR_CODES.INVALID_INPUT,
        `La sensibilité demandée doit être une valeur normalisée (${DDR_SENSITIVITIES_MA.join(", ")} mA).`,
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

  const requested = circuits
    .map((c) => c.sensitivityMa)
    .filter((value) => value !== undefined);

  return Math.min(30, ...requested);
}

/**
 * Détermine le type de DDR : 'A' si au moins un circuit a de l'électronique de puissance,
 * sinon 'AC' par défaut. (Simplification conforme à la spécification RESIDENTIEL.md)
 */
function determineType(circuits) {
  assertCircuits(circuits);
  const rank = { AC: 0, A: 1, F: 2, B: 3 };
  let selectedType = "AC";
  for (const circuit of circuits) {
    const type = circuit.loadClass !== undefined
      ? DDR_TYPES[circuit.loadClass]
      : circuit.hasElectronicLoad
        ? "A"
        : "AC";
    if (!type) {
      throw new NormativeError(
        NORMATIVE_ERROR_CODES.INVALID_INPUT,
        `Classe de charge non prise en charge : ${circuit.loadClass}.`,
        {
          details: { field: "loadClass", value: circuit.loadClass },
        },
      );
    }
    if (rank[type] > rank[selectedType]) selectedType = type;
  }
  return selectedType;
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

  const sorted = DDR_STANDARD_RATINGS_A.slice().sort((a, b) => a - b);
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
    manufacturerNotice:
      "Confirmer le type de DDR requis dans la notice du fabricant de chaque appareil.",
  };
}

module.exports = {
  determineSensitivity,
  determineType,
  selectStandardRating,
  designDDRForGroup,
  DDR_TYPES,
};
