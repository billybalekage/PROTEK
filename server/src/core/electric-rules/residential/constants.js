const temperatureDataset = require("./data/temperature-factors.json");
const groupingDataset = require("./data/grouping-factors.json");
const capacityDataset = require("./data/current-carrying-capacities.json");

const STANDARD_BREAKER_RATINGS_A = Object.freeze([
  2, 3, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125,
]);

const DDR_STANDARD_RATINGS_A = Object.freeze([25, 40, 63, 80, 100]);
const DDR_SENSITIVITIES_MA = Object.freeze([30, 100, 300, 500]);

const STANDARD_CABLE_SECTION_MM2 = Object.freeze([
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95,
]);

const VOLTAGE_DROP_LIMITS_PERCENT = Object.freeze({ lighting: 3, other: 5 });
const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0225
const CABLE_REACTANCE_OHM_PER_M = 0.00008
const REACTANCE_THRESHOLD_MM2 = 50

const REFERENCE_AMBIENT_TEMP_C = 30
const NOMINAL_PHASE_VOLTAGE_V = 230

const MIN_SECTION_BY_BREAKER = Object.freeze([
  [16, 1.5],
  [20, 2.5],
  [25, 4],
  [32, 6],
  [40, 10],
  [50, 10],
  [63, 16],
]);

const BASE_CAPACITY_COPPER_A = Object.freeze({
  [capacityDataset.insulation]: Object.freeze(
    Object.fromEntries(
      Object.entries(capacityDataset.installationMethods).map(([method, rows]) => [
        method,
        Object.freeze(
          Object.fromEntries(
            Object.entries(rows).map(([conductors, values]) => [
              conductors,
              Object.freeze(values),
            ]),
          ),
        ),
      ]),
    ),
  ),
});

const TEMPERATURE_FACTORS = Object.freeze({
  PVC: Object.freeze(temperatureDataset.PVC),
  XLPE: Object.freeze(temperatureDataset.XLPE),
});

const GROUPING_FACTORS = Object.freeze(groupingDataset.factors);

module.exports = {
  STANDARD_BREAKER_RATINGS_A,
  DDR_SENSITIVITIES_MA,
  DDR_STANDARD_RATINGS_A,
  STANDARD_CABLE_SECTION_MM2,
  VOLTAGE_DROP_LIMITS_PERCENT,
  CABLE_REACTANCE_OHM_PER_M,
  COPPER_RESISTIVITY_OHM_MM2_PER_M,
  REACTANCE_THRESHOLD_MM2,
  REFERENCE_AMBIENT_TEMP_C,
  NOMINAL_PHASE_VOLTAGE_V,
  MIN_SECTION_BY_BREAKER,
  BASE_CAPACITY_COPPER_A,
  TEMPERATURE_FACTORS,
  GROUPING_FACTORS,
  TEMPERATURE_FACTOR_DATASET: temperatureDataset,
  GROUPING_FACTOR_DATASET: groupingDataset,
  CURRENT_CAPACITY_DATASET: capacityDataset,
};
