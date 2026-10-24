"use strict";

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
  REFERENCE_AMBIENT_TEMP_C,
  VOLTAGE_DROP_LIMITS_PERCENT,
  TEMPERATURE_FACTOR_DATASET,
  GROUPING_FACTOR_DATASET,
  CURRENT_CAPACITY_DATASET,
} = require("./constants");
const { EPSILON } = require("../shared/constants");
const { assertPositive } = require("../shared/validators");
const { assertVerified } = require("../shared/data-loader");
const { calculateVoltageDropPercent } = require("./voltage-drop");

function getTemperatureFactor(insulation, ambientTempC) {
  assertVerified(
    TEMPERATURE_FACTOR_DATASET,
    "facteurs de température",
  );
  if (!Object.prototype.hasOwnProperty.call(TEMPERATURE_FACTORS, insulation)) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Isolant non pris en charge : ${insulation}.`,
      { details: { insulation } },
    );
  }
  const table = TEMPERATURE_FACTORS[insulation];
  if (ambientTempC === REFERENCE_AMBIENT_TEMP_C) return 1;

  if (!Array.isArray(table) || table.length === 0) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Les facteurs de température normatifs pour ${insulation} hors de ${REFERENCE_AMBIENT_TEMP_C} °C ne sont pas configurés.`,
      { details: { insulation, ambientTempC } },
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
      `Température ambiante ${ambientTempC} °C hors de la plage tabulée (${tMin} - ${tMax} °C) pour l'isolant ${insulation}.`,
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
      "Le nombre de circuits groupés doit être un entier supérieur ou égal à 1.",
      { details: { groupedCircuits } },
    );
  }

  if (groupedCircuits === 1) return 1;

  assertVerified(
    GROUPING_FACTOR_DATASET,
    "facteurs de groupement",
  );
  let factor;
  for (const [n, k] of GROUPING_FACTORS) {
    if (groupedCircuits >= n) factor = k;
  }

  if (
    factor === undefined ||
    groupedCircuits > GROUPING_FACTORS[GROUPING_FACTORS.length - 1][0]
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Aucun facteur de groupement normatif n'est configuré pour ${groupedCircuits} circuits.`,
      {
        reference: "CEI 60364-5-52",
        details: { groupedCircuits },
      },
    );
  }

  return factor;
}

function getBaseCapacity({
  insulation,
  installMethod,
  loadedConductors,
  sectionMm2,
}) {
  assertVerified(
    CURRENT_CAPACITY_DATASET,
    "capacités de transport",
  );
  const methods = BASE_CAPACITY_COPPER_A[insulation];
  if (!methods?.[installMethod]) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Mode de pose ${installMethod} non couvert par les tables chargées ; section à justifier hors outil.`,
      {
        reference: "CEI 60364-5-52",
        details: { insulation, installMethod },
      },
    );
  }
  const row = methods[installMethod][loadedConductors];
  const index = STANDARD_CABLE_SECTION_MM2.indexOf(sectionMm2);
  if (!row || index === -1) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Aucune valeur vérifiée pour la combinaison isolant ${insulation}, mode ${installMethod}, ${loadedConductors} conducteurs chargés, section ${sectionMm2} mm² ; dimensionnement hors outil requis.`,
      {
        reference: "CEI 60364-5-52",
        details: { insulation, installMethod, loadedConductors, sectionMm2 },
      },
    );
  }

  return row[index];
}

function calculateCorrectedCapacity({
  insulation,
  installMethod,
  loadedConductors,
  sectionMm2,
  ambientTempC = REFERENCE_AMBIENT_TEMP_C,
  groupedCircuits = 1,
}) {
  const i0 = getBaseCapacity({
    insulation,
    installMethod,
    loadedConductors,
    sectionMm2,
  });
  const kTemp = getTemperatureFactor(insulation, ambientTempC);
  const kGroup = getGroupingFactor(groupedCircuits);
  const k = kTemp * kGroup;
  return { i0, kTemp, kGroup, k, iz: i0 * k };
}

function getMinSectionForBreaker(inA) {
  const entry = MIN_SECTION_BY_BREAKER.find(([maxIn]) => inA <= maxIn);
  return entry ? entry[1] : 0;
}

/**
 * @throws {NormativeError} CABLE_NOT_PROTECTED
 */

function verifyCableProtection({ ibA, inA, izA, i2A = 1.45 * inA }) {
  assertPositive(ibA, "ibA");
  assertPositive(inA, "inA");
  assertPositive(izA, "izA");
  assertPositive(i2A, "i2A");
  if (
    ibA > inA + EPSILON ||
    inA > izA + EPSILON ||
    i2A > 1.45 * izA + EPSILON
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.CABLE_NOT_PROTECTED,
      `Câble non protégé contre les surcharges : les conditions Ib ≤ In ≤ Iz et I₂ ≤ 1,45 × Iz doivent être respectées (Ib = ${ibA.toFixed(2)} A, In = ${inA} A, I₂ = ${i2A} A, Iz = ${izA} A).`,
      {
        reference: "NF C 15-100 paragraphe 433 - CEI 60364-4-43",
        details: { ibA, inA, i2A, izA },
      },
    );
  }
  return true;
}

/**
 * @throws {NormativeError} EXCEEDING_CABLE_CAPACITY
 */

function selectCableSection({
  inA,
  ibA = inA,
  minSectionMm2 = 0,
  voltageDrop,
  ...cableParams
}) {
  const floor = Math.max(minSectionMm2, getMinSectionForBreaker(inA));
  const candidates = STANDARD_CABLE_SECTION_MM2.filter((s) => s >= floor);
  let cableWithCapacityFound = false;

  for (const sectionMm2 of candidates) {
    const capacity = calculateCorrectedCapacity({ ...cableParams, sectionMm2 });
    if (capacity.iz >= inA - EPSILON) {
      cableWithCapacityFound = true;
      let voltageDropResult;
      if (voltageDrop) {
        const { circuitType = "other", ...voltageDropParams } = voltageDrop;
        const limit = VOLTAGE_DROP_LIMITS_PERCENT[circuitType];
        if (limit === undefined) {
          throw new NormativeError(
            NORMATIVE_ERROR_CODES.INVALID_INPUT,
            `Type de circuit non pris en charge : ${circuitType}.`,
            { details: { field: "circuitType", value: circuitType } },
          );
        }
        voltageDropResult = calculateVoltageDropPercent({
          ...voltageDropParams,
          ibA,
          sectionMm2,
        });
        if (voltageDropResult.percent > limit) continue;
      }
      return { sectionMm2, ...capacity, voltageDrop: voltageDropResult };
    }
  }

  if (cableWithCapacityFound && voltageDrop) {
    const { circuitType = "other", ...voltageDropParams } = voltageDrop;
    const limit = VOLTAGE_DROP_LIMITS_PERCENT[circuitType];
    const largestSectionMm2 =
      STANDARD_CABLE_SECTION_MM2[STANDARD_CABLE_SECTION_MM2.length - 1];
    const result = calculateVoltageDropPercent({
      ...voltageDropParams,
      ibA,
      sectionMm2: largestSectionMm2,
    });
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.VOLTAGE_DROP_EXCEEDED,
      `La chute de tension (${result.percent.toFixed(3)} %) dépasse la limite de ${limit} % même avec ${largestSectionMm2} mm².`,
      {
        reference: "NF C 15-100 partie 5-52 - CEI 60364-5-52",
        details: {
          measuredPercent: result.percent,
          maximumPercent: limit,
          ibA,
          sectionMm2: largestSectionMm2,
        },
      },
    );
  }

  const max = STANDARD_CABLE_SECTION_MM2[STANDARD_CABLE_SECTION_MM2.length - 1]
  throw new NormativeError(
    NORMATIVE_ERROR_CODES.EXCEEDING_CABLE_CAPACITY,
    `Aucune section standard (jusqu'à ${max} mm² Cu) ne permet de transporter In = ${inA} A dans ces conditions.`,
    {
      reference: "NF C 15-100 partie 5-52 - CEI 60364-5-52",
      details: { inA, maxSectionMm2: max },
    },
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
