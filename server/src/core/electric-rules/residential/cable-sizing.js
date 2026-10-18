"use strict";

const { number } = require("joi");
const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const {
  STANDARD_CABLE_SECTION_MM2,
  BASE_CAPACITY_COPPER_A,
  TEMPERATURE_FACTORS,
  GROUPING_FACTORS,
  MIN_SECTION_BY_BREAKER,
} = require("./constants");
const { EPSILON } = require("./overcurrent-protection");

function getTemperatureFactor(insulation, ambientTempC) {
  const table = TEMPERATURE_FACTORS[insulation];
  if (!table) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Isolant inconnu ${insulation} (valeurs admises : PVC, XLPE).`,
      { details: { insulation } },
    );
  }

  const [tMin] = table[0];
  const [tMax] = table[table.length - 1];
  if (
    typeof ambientTempC !== "number" ||
    ambientTempC < tMin ||
    ambientTempC > tMax
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.TEMPERATURE_OUT_OF_RANGE,
      `Température ambiante ${ambientTempC} °C hors de la page tabulée (${tMin} - ${tMax} °C) pour l'isolant ${insulation}. Utilisez  un cable a isolation superieure ou renvoyer le mode de pose.`,
      { reference: "CEI 60364-5-52", details: { ambientTempC, tMin, tMax } },
    );
  }

  for (let i = 0; i < table.length - 1; i += 1) {
    const [t1, k1] = table[i];
    const [t2, k2] = table[i + 1];
    if (ambientTempC >= t1 && ambientTempC <= t2) {
      return k1 + ((k2 - k1) * (ambientTempC - t1)) / (t2 - t1);
    }
  }

  return table[table.length - 1][1];
}

function getGroupingFactor(groupedCircuits) {
  if (!Number.isInteger(groupedCircuits) || groupedCircuits < 1) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "Le nombre de circuits groupés doit etre  un entier >= 1.",
      { details: { groupedCircuits } },
    );
  }

  let factor = GROUPING_FACTORS[0][1];
  for (const [n, k] of GROUPING_FACTORS) {
    if (groupedCircuits >= n) factor = k;
  }

  return factor;
}

function getBaseCapacity({
  insulation,
  installMethod,
  loadedConductors,
  sectionMm2,
}) {
  const row =
    BASE_CAPACITY_COPPER_A[insulation]?.[installMethod]?.[loadedConductors];
  const index = STANDARD_CABLE_SECTION_MM2.indexOf(sectionMm2);
  if (!row || index === -1) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Combinaison non supportée ( isolant ${insulation}, mode de pose ${installMethod}, ${loadedConductors} conducteurs chargés, section ${sectionMm2} milimetre carré )`,
      { details: { insulation, installMethod, loadedConductors, sectionMm2 } },
    );
  }

  return row[index];
}

function calculateCorrectedCapacity({
  insulation, 
  installMethod, 
  loadedConductors, 
  sectionMm2,
  ambientTempC,
  groupedCircuits = 1
}) {
  const i0 = getBaseCapacity({insulation, installMethod, loadedConductors, sectionMm2});
  const kTemp = getTemperatureFactor(insulation,ambientTempC)
  const kGroup = getGroupingFactor(groupedCircuits)
  const k = kTemp * kGroup;
  return {i0, kTemp, kGroup, k, iz: i0 * k}
}

 function getMinSectionForBreaker(inA) {
  const entry = MIN_SECTION_BY_BREAKER.find(([maxIn]) => inA <= maxIn);
  return entry ? entry[1] : STANDARD_CABLE_SECTION_MM2[0];
 }

/**
 * @throws {NormativeError} CABLE_NOT_PROTECTED
 */

function verifyCableProtection({
  ibA, inA, izA
}) {
  if (ibA > inA + EPSILON || inA > izA + EPSILON) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.CABLE_NOT_PROTECTED,
      `Cable non protegé contre les surcharges: la condition Ib <= In <= Iz n'est pas respectée (Ib = ${ibA.toFixed(2)} A, In = ${inA} A, Iz = ${izA.toFixed(2)} A)`
    )
  }
  return true
}

/**
 * @throws {NormativeError} EXCEEDING_CABLE_CAPACITY
 */

function selectCableSection({
  inA, minSectionMm2 = 0, ...cableParams
}) {
  const floor = Math.max(minSectionMm2, getMinSectionForBreaker(inA));
  const candidates = STANDARD_CABLE_SECTION_MM2.filter((s) =>s >= floor)

  for (const sectionMm2 of candidates) {
    const  capacity = calculateCorrectedCapacity({ ...cableParams, sectionMm2});
    if (capacity.iz >= inA - EPSILON) {
      return { sectionMm2, ...capacity}
    }
  }

  const max = STANDARD_CABLE_SECTION_MM2[STANDARD_CABLE_SECTION_MM2.length - 1]
  throw new NormativeError(
    NORMATIVE_ERROR_CODES.EXCEEDING_CABLE_CAPACITY,
    `Aucune section standard (jusqu'a ${max} milimetre carré Cu) ne permet pas de transporter In = ${inA} A dans ces conditions.`,
    { reference: 'NF C 15-100 partie 5-52 - CEI 60364-5-52', details: {inA, maxSectionMm2: max}}
  )
}

module.exports = {
  getTemperatureFactor,
  getBaseCapacity,
  getGroupingFactor, 
  getMinSectionForBreaker,
  calculateCorrectedCapacity,
  verifyCableProtection,
  selectCableSection
}
