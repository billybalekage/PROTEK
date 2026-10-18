"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../electric-rules/shared/normative-error");
const { calculateDesignCurrent } = require("./design-current.Js");
const {
  calculateVoltageDropPercent,
  validateVoltageDrop,
} = require("../electric-rules/residential/voltage-drop");
const {
  determineSensitivity,
  determineType,
  designDDRForGroup,
} = require("../electric-rules/residential/protection-ddr");
const { selectBreakerRating } = require("../electric-rules/residential/overcurrent-protection");
const { verifyCableProtection } = require("../electric-rules/residential/cable-sizing");

describe("calcul du courant d'emploi", () => {
  test("calcule Ib en monophasé", () => {
    expect(
      calculateDesignCurrent({
        powerW: 2300,
        voltageV: 230,
      }),
    ).toBe(10);
  });

  test("calcule Ib en triphasé avec les coefficients de pondération", () => {
    expect(
      calculateDesignCurrent({
        powerW: 12000,
        voltageV: 400,
        phases: 3,
        cosPhi: 0.8,
        utilisationFacteur: 0.75,
        simultaneityFactor: 0.9,
      }),
    ).toBeCloseTo(14.614179, 5);
  });

  test("rejette un nombre de phases non pris en charge", () => {
    expect(() =>
      calculateDesignCurrent({ powerW: 1000, voltageV: 230, phases: 2 }),
    ).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
      }),
    );
  });
});

describe("protection contre les surintensités", () => {
  test("sélectionne le premier calibre normalisé supérieur ou égal à Ib", () => {
    expect(selectBreakerRating(16)).toBe(16);
    expect(selectBreakerRating(16.1)).toBe(20);
  });

  test("vérifie la coordination Ib <= In <= Iz", () => {
    expect(verifyCableProtection({ ibA: 16, inA: 20, izA: 25 })).toBe(true);
    expect(() => verifyCableProtection({ ibA: 21, inA: 20, izA: 25 })).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.CABLE_NOT_PROTECTED,
      }),
    );
  });
});

describe("chute de tension", () => {
  test("calcule la chute monophasée sur l'aller-retour", () => {
    const result = calculateVoltageDropPercent({
      ibA: 16,
      lengthM: 20,
      sectionMm2: 2.5,
    });

    expect(result.deltaV).toBeCloseTo(5.76, 5);
    expect(result.percent).toBeCloseTo((5.76 / 230) * 100, 5);
  });

  test("utilise la tension composée de 400 V par défaut en triphasé", () => {
    const result = calculateVoltageDropPercent({
      ibA: 16,
      lengthM: 20,
      sectionMm2: 2.5,
      phases: 3,
    });

    expect(result.deltaV).toBeCloseTo(Math.sqrt(3) * 16 * 0.18, 5);
    expect(result.percent).toBeCloseTo((result.deltaV / 400) * 100, 5);
  });

  test("rejette les facteurs de puissance hors de (0, 1]", () => {
    expect(() =>
      calculateVoltageDropPercent({
        ibA: 16,
        lengthM: 20,
        sectionMm2: 2.5,
        cosPhi: 1.1,
      }),
    ).toThrow(NormativeError);
  });

  test("signale une chute supérieure à la limite d'éclairage", () => {
    expect(() =>
      validateVoltageDrop({
        ibA: 16,
        lengthM: 30,
        sectionMm2: 2.5,
        circuitType: "lighting",
      }),
    ).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.VOLTAGE_DROP_EXCEEDED,
      }),
    );
  });

  test("accepte une chute inférieure à la limite du circuit", () => {
    const result = validateVoltageDrop({
      ibA: 10,
      lengthM: 10,
      sectionMm2: 2.5,
      circuitType: "lighting",
    });

    expect(result.percent).toBeLessThanOrEqual(3);
  });
});

describe("dimensionnement du DDR", () => {
  test("retient la sensibilité la plus stricte demandée par les circuits", () => {
    expect(
      determineSensitivity([{ sensitivityMa: 300 }, { sensitivityMa: 30 }]),
    ).toBe(30);
    expect(
      determineSensitivity([{ sensitivityMa: 300 }, { sensitivityMa: 100 }]),
    ).toBe(100);
  });

  test("utilise 30 mA comme sensibilité résidentielle par défaut", () => {
    expect(determineSensitivity([{ ibA: 10 }])).toBe(30);
  });

  test("choisit le type A si un circuit du groupe a une charge électronique", () => {
    expect(
      determineType([
        { hasElectronicLoad: false },
        { hasElectronicLoad: true },
      ]),
    ).toBe("A");
    expect(determineType([{ hasElectronicLoad: false }])).toBe("AC");
  });

  test("additionne Ib et sélectionne le calibre DDR normalisé supérieur", () => {
    expect(
      designDDRForGroup([
        { ibA: 12, sensitivityMa: 300 },
        { ibA: 20, sensitivityMa: 30, hasElectronicLoad: true },
      ]),
    ).toEqual({
      totalIb: 32,
      sensitivityMa: 30,
      type: "A",
      ratingA: 40,
    });
  });

  test("signale un courant supérieur au calibre DDR maximal", () => {
    expect(() => designDDRForGroup([{ ibA: 101 }])).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.DDR_CAPACITY_EXCEEDED,
      }),
    );
  });
});
