"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { assertPositive } = require("../shared/validators");
const { CABLE_REACTANCE_OHM_PER_M } = require("./constants");

function calculateProspectiveShortCircuit({
  upstreamIccA,
  voltageV,
  lengthM,
  sectionMm2,
  resistivityOhmMm2PerM,
  conductorRatio = 1,
  maxVoltageFactor,
}) {
  assertPositive(upstreamIccA, "upstreamIccA");
  assertPositive(voltageV, "voltageV");
  assertPositive(lengthM, "lengthM");
  assertPositive(sectionMm2, "sectionMm2");
  assertPositive(resistivityOhmMm2PerM, "resistivityOhmMm2PerM");
  assertPositive(conductorRatio, "conductorRatio");
  assertPositive(maxVoltageFactor, "maxVoltageFactor");

  const sourceImpedanceOhm = voltageV / upstreamIccA;
  const resistanceOhm =
    (resistivityOhmMm2PerM * lengthM * (1 + conductorRatio)) / sectionMm2;
  const reactanceOhm = CABLE_REACTANCE_OHM_PER_M * lengthM;
  const totalImpedanceOhm = Math.hypot(
    sourceImpedanceOhm + resistanceOhm,
    reactanceOhm,
  );
  const iccMaxA = (maxVoltageFactor * voltageV) / totalImpedanceOhm;
  const iccMinA =
    (0.8 * voltageV) /
    ((resistivityOhmMm2PerM * (1 + conductorRatio) * lengthM) / sectionMm2);

  return {
    upstreamIccA,
    sourceImpedanceOhm,
    resistanceOhm,
    reactanceOhm,
    totalImpedanceOhm,
    iccMaxA,
    iccMinA,
    reference: "Modèle simplifié fourni — à valider selon le régime de neutre et les données réseau",
  };
}

function verifyBreakingCapacity({ pdcA, iccMaxA }) {
  assertPositive(pdcA, "pdcA");
  assertPositive(iccMaxA, "iccMaxA");
  if (pdcA < iccMaxA) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.SHORT_CIRCUIT_PDC_INADEQUATE,
      `Le pouvoir de coupure ${pdcA} A est inférieur au courant de court-circuit maximal calculé ${iccMaxA.toFixed(2)} A.`,
      {
        reference: "CEI 60364-4-43",
        details: { pdcA, iccMaxA },
      },
    );
  }
  return true;
}

function verifyMagneticTrip({ iccMinA, inA, magneticTripMultiple }) {
  assertPositive(iccMinA, "iccMinA");
  assertPositive(inA, "inA");
  assertPositive(magneticTripMultiple, "magneticTripMultiple");
  const requiredCurrentA = inA * magneticTripMultiple;
  if (iccMinA < requiredCurrentA) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.MAGNETIC_TRIP_NOT_GUARANTEED,
      `Le courant de court-circuit minimal ${iccMinA.toFixed(2)} A ne garantit pas le déclenchement magnétique (${requiredCurrentA.toFixed(2)} A requis).`,
      {
        reference: "CEI 60364-4-41 — seuil de déclenchement à confirmer par la courbe constructeur",
        details: { iccMinA, inA, magneticTripMultiple, requiredCurrentA },
      },
    );
  }
  return true;
}

module.exports = {
  calculateProspectiveShortCircuit,
  verifyBreakingCapacity,
  verifyMagneticTrip,
};
