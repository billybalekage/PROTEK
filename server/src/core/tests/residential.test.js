"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../electric-rules/shared/normative-error");
const {
  calculateDesignCurrent,
} = require("../electric-rules/residential/design-current");
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
const {
  getBaseCapacity,
  getGroupingFactor,
  getMinSectionForBreaker,
  getTemperatureFactor,
  verifyCableProtection,
} = require("../electric-rules/residential/cable-sizing");
const { conductorReactanceOhm } = require("../electric-rules/residential/voltage-drop");
const { designCircuit } = require("../electric-rules/residential/design-circuit");
const {
  calculateEarthResistanceLimit,
  calculateProtectiveConductorSection,
  verifyEarthResistance,
} = require("../electric-rules/residential/protection-earth");
const {
  calculateProspectiveShortCircuit,
  verifyBreakingCapacity,
  verifyMagneticTrip,
} = require("../electric-rules/residential/short-circuit");
const {
  assessAmperemetricSelectivity,
  verifyDifferentialSelectivity,
} = require("../electric-rules/residential/selectivity");
const { adjustDesignCurrentForLowVoltage } = require("../electric-rules/residential/network-stability");
const { findVerifiedFiliation } = require("../electric-rules/residential/filiation");
const { assertVerified } = require("../electric-rules/shared/data-loader");

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
    expect(selectBreakerRating(28)).toBe(32);
  });

  describe("orchestration du dimensionnement résidentiel", () => {
    test("enchaîne Ib, In, section, Iz et la chute de tension", () => {
      const result = designCircuit({
        current: { powerW: 2300, voltageV: 230 },
        cable: {
          insulation: "PVC",
          installMethod: "C",
          loadedConductors: 2,
          ambientTempC: 30,
        },
        voltageDrop: { lengthM: 50, phases: 1, circuitType: "lighting" },
      });

      expect(result).toMatchObject({
        ibA: 10,
        inA: 10,
        sectionMm2: 4,
        i0: 32,
        kTemp: 1,
        kGroup: 1,
      });
      expect(result.voltageDrop.percent).toBeLessThanOrEqual(3);
    });
  });

  test("vérifie la coordination Ib <= In <= Iz", () => {
    expect(verifyCableProtection({ ibA: 16, inA: 20, izA: 25 })).toBe(true);
    expect(() => verifyCableProtection({ ibA: 21, inA: 20, izA: 25 })).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.CABLE_NOT_PROTECTED,
      }),
    );
  });

  test("applique la condition thermique I2 <= 1,45 Iz", () => {
    expect(() =>
      verifyCableProtection({ ibA: 10, inA: 10, izA: 10, i2A: 15 }),
    ).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.CABLE_NOT_PROTECTED,
      }),
    );
  });

  test("renvoie 0 comme section minimale au-delà des calibres tabulés", () => {
    expect(getMinSectionForBreaker(80)).toBe(0);
  });

  test("lit les capacités dans la hiérarchie isolant/mode/conducteurs", () => {
    expect(
      getBaseCapacity({
        insulation: "PVC",
        installMethod: "C",
        loadedConductors: 2,
        sectionMm2: 1.5,
      }),
    ).toBe(17.5);
  });

  test("refuse un mode de pose sans table vérifiée", () => {
    expect(() =>
      getBaseCapacity({
        insulation: "PVC",
        installMethod: "B1",
        loadedConductors: 2,
        sectionMm2: 2.5,
      }),
    ).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
        message: expect.stringContaining("dimensionnement hors outil requis"),
      }),
    );
  });

  test("retourne le facteur de groupement unitaire pour un circuit", () => {
    expect(getGroupingFactor(1)).toBe(1);
    expect(() => getGroupingFactor(2)).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
      }),
    );
  });

  test("utilise le coefficient de référence, mais refuse une table absente", () => {
    expect(getTemperatureFactor("PVC", 30)).toBe(1);
    expect(() => getTemperatureFactor("PVC", 40)).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.TEMPERATURE_OUT_OF_RANGE,
      }),
    );
  });

  test("accepte 30 °C même si la table n'est pas vérifiée en production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      expect(getTemperatureFactor("PVC", 30)).toBe(1);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test("néglige la réactance sous 50 mm² uniquement", () => {
    expect(conductorReactanceOhm(10, 16)).toBe(0);
    expect(conductorReactanceOhm(10, 50)).toBeGreaterThan(0);
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
    ).toBe(30);
  });

  test("refuse les sensibilités DDR non normalisées", () => {
    expect(() => determineSensitivity([{ sensitivityMa: 45 }])).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
      }),
    );
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

  test.each([
    ["standard", "AC"],
    ["electronique", "A"],
    ["variateur_mono", "F"],
    ["variateur_tri", "B"],
    ["onduleur_pv", "B"],
  ])("sélectionne le type DDR %s", (loadClass, expectedType) => {
    expect(determineType([{ loadClass }])).toBe(expectedType);
  });

  test("retient le type le plus protecteur pour un groupe de circuits", () => {
    expect(
      determineType([
        { loadClass: "variateur_mono" },
        { loadClass: "onduleur_pv" },
        { loadClass: "standard" },
      ]),
    ).toBe("B");
  });

  test("refuse une classe de charge inconnue", () => {
    expect(() => determineType([{ loadClass: "unknown" }])).toThrow(
      expect.objectContaining({
        code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
      }),
    );
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
      manufacturerNotice:
        "Confirmer le type de DDR requis dans la notice du fabricant de chaque appareil.",
    });
  });

  describe("protection de terre et PE", () => {
    test("sépare la limite de sécurité calculée de la recommandation 100 ohms", () => {
      expect(calculateEarthResistanceLimit({ sensitivityMa: 30 })).toEqual({
        safetyLimitOhm: 50 / 0.03,
        recommendedLimitOhm: 100,
        reference: "CEI 60364-4-41",
      });
      expect(
        verifyEarthResistance({ earthResistanceOhm: 150, sensitivityMa: 30 }),
      ).toMatchObject({
        safetyCompliant: true,
        meetsRecommendation: false,
      });
    });

    test.each([
      [1.5, 1.5],
      [16, 16],
      [25, 16],
      [35, 16],
      [70, 35],
    ])("calcule la section PE pour S=%s mm²", (phaseSection, expectedPeSection) => {
      expect(calculateProtectiveConductorSection(phaseSection)).toBe(
        expectedPeSection,
      );
    });
  });

  describe("courants de court-circuit et pouvoir de coupure", () => {
    const shortCircuit = {
      upstreamIccA: 5000,
      voltageV: 230,
      lengthM: 10,
      sectionMm2: 2.5,
      resistivityOhmMm2PerM: 0.0225,
      conductorRatio: 1,
      maxVoltageFactor: 1.1,
    };

    test("calcule Icc max avec l'Icc amont obligatoire et Icc min", () => {
      const result = calculateProspectiveShortCircuit(shortCircuit);
      expect(result.iccMaxA).toBeGreaterThan(0);
      expect(result.iccMinA).toBeCloseTo(1022.222, 2);
      expect(result.upstreamIccA).toBe(5000);
    });

    test("refuse un Pdc inférieur à Icc max", () => {
      const result = calculateProspectiveShortCircuit(shortCircuit);
      expect(() =>
        verifyBreakingCapacity({ pdcA: 1000, iccMaxA: result.iccMaxA }),
      ).toThrow(
        expect.objectContaining({
          code: NORMATIVE_ERROR_CODES.SHORT_CIRCUIT_PDC_INADEQUATE,
        }),
      );
    });

    test("vérifie le seuil de déclenchement magnétique fourni", () => {
      expect(() =>
        verifyMagneticTrip({
          iccMinA: 100,
          inA: 20,
          magneticTripMultiple: 10,
        }),
      ).toThrow(
        expect.objectContaining({
          code: NORMATIVE_ERROR_CODES.MAGNETIC_TRIP_NOT_GUARANTEED,
        }),
      );
    });

    test("exige explicitement l'Icc amont", () => {
      expect(() =>
        calculateProspectiveShortCircuit({
          voltageV: 230,
          lengthM: 10,
          sectionMm2: 2.5,
          resistivityOhmMm2PerM: 0.0225,
        }),
      ).toThrow(
        expect.objectContaining({
          code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
        }),
      );
    });

    test("exige un coefficient de tension maximal explicite", () => {
      expect(() =>
        calculateProspectiveShortCircuit({
          ...shortCircuit,
          maxVoltageFactor: undefined,
        }),
      ).toThrow(
        expect.objectContaining({
          code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
          details: { field: "maxVoltageFactor", value: undefined },
        }),
      );
    });
  });

  describe("sélectivité des protections", () => {
    test("qualifie la règle ampèremétrique comme empirique", () => {
      expect(
        assessAmperemetricSelectivity({
          upstreamRatingA: 32,
          downstreamRatingA: 16,
        }),
      ).toMatchObject({
        ratio: 2,
        empiricallySelective: true,
        guaranteedByManufacturer: false,
      });
    });

    test("requiert DDR type S temporisé et rapport différentiel 3", () => {
      expect(() =>
        verifyDifferentialSelectivity({
          upstreamSensitivityMa: 100,
          downstreamSensitivityMa: 30,
          upstreamType: "AC",
          upstreamDelayMs: 100,
        }),
      ).toThrow(
        expect.objectContaining({
          code: NORMATIVE_ERROR_CODES.DIFFERENTIAL_SELECTIVITY_FAILURE,
        }),
      );
      expect(
        verifyDifferentialSelectivity({
          upstreamSensitivityMa: 100,
          downstreamSensitivityMa: 30,
          upstreamType: "S",
          upstreamDelayMs: 100,
        }).guaranteedByManufacturer,
      ).toBe(false);
    });
  });

  describe("adaptation au réseau instable", () => {
    test("augmente Ib à puissance constante et recommande un relais de tension", () => {
      expect(
        adjustDesignCurrentForLowVoltage({
          ibA: 10,
          nominalVoltageV: 230,
          minimumVoltageV: 207,
        }),
      ).toMatchObject({
        ibA: 10 * (230 / 207),
        recommendVoltageRelay: true,
      });
    });

    test("permet de désactiver la correction optionnelle", () => {
      expect(
        adjustDesignCurrentForLowVoltage({
          ibA: 10,
          nominalVoltageV: 230,
          minimumVoltageV: 207,
          enabled: false,
        }),
      ).toMatchObject({ ibA: 10, recommendVoltageRelay: false });
    });
  });

  describe("qualité des données normatives", () => {
    test("bloque les tables non vérifiées hors de l'environnement de test", () => {
      const previousEnvironment = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      try {
        expect(() =>
          getBaseCapacity({
            insulation: "PVC",
            installMethod: "C",
            loadedConductors: 2,
            sectionMm2: 1.5,
          }),
        ).toThrow(
          expect.objectContaining({
            code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
            details: { table: "capacités de transport" },
          }),
        );
        expect(() =>
          assertVerified({ meta: { standard: "CEI 60364-5-52" } }, "essai"),
        ).toThrow(
          expect.objectContaining({
            code: NORMATIVE_ERROR_CODES.INVALID_INPUT,
            details: { table: "essai" },
          }),
        );
      } finally {
        process.env.NODE_ENV = previousEnvironment;
      }
    });

    test("n'accepte une filiation que si le catalogue contient une ligne vérifiée", () => {
      expect(
        findVerifiedFiliation({
          upstream: "C60N-32A",
          downstream: "iC60N-16A",
          iccMaxKA: 10,
        }),
      ).toBeNull();
    });

    test("accepte une table dont la source et la relecture sont documentées", () => {
      const previousEnvironment = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      try {
        const dataset = {
          meta: {
            standard: "CEI 60364-5-52",
            table: "B.52.x",
            edition: "édition de validation",
            enteredBy: "Ingénieur A",
            verifiedBy: "Ingénieur B",
            verifiedAt: "2026-10-24T00:00:00.000Z",
            status: "verified",
          },
        };
        expect(assertVerified(dataset, "table vérifiée")).toBe(dataset);
      } finally {
        process.env.NODE_ENV = previousEnvironment;
      }
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
