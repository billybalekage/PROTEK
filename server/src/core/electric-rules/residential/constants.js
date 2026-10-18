const STANDARD_BREAKER_RATTINGS_A = Object.freeze([
    2,3,4,6,10,16,20, 25, 35, 40, 50, 63, 80, 100, 125
])

const DDR_STANDARD_RATTINGS_A = Object.freeze([
    25, 40, 63, 80, 100
])
const DDR_SENSITIVITIES_MA = Object.freeze([
    30, 100, 300, 500
])


const STANDARD_CABLE_SECTION_MM2 = Object.freeze([
    1.4, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95
])

const VOLTAGE_DROP_LIMITS_PERCENT = Object.freeze({ lighting: 3, other: 5})
const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0225
const CABLE_REACTANCE_OHM_PER_M = 0.00008
const REACTANCE_THRESHOLD_MM2 = 50

const REFERENCE_AMBIENT_TEMP_C = 30
const MINIMAL_PHASE_VOLTAGE_V = 230

const MIN_SECTION_BY_BREAKER = Object.freeze([
    [16, 1.5],
    [20, 2,5],
    [25, 4],
    [32, 6],
    [40, 10],
    [50, 10],
    [63, 16],
])

const BASE_CAPACITY_COPPER_A = Object.freeze({
    PVC: {
        2: [15, 5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207],
        3:[13.5, 18, 24, 31, 42, 56, 73, 89, 108, 136, 164],
    },

    C: {
        2: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232],
        3: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207 ]
    }

    // XLPE
})

const TEMPERATURE_FACTORS = Object.freeze({
    //PVC
    // C
    // XLPE
})

const GROUPING_FACTORS = Object.freeze({})

module.exports = {
    STANDARD_BREAKER_RATTINGS_A,
    DDR_SENSITIVITIES_MA,
    DDR_STANDARD_RATTINGS_A,
    STANDARD_CABLE_SECTION_MM2,
    VOLTAGE_DROP_LIMITS_PERCENT,
    CABLE_REACTANCE_OHM_PER_M,
    COPPER_RESISTIVITY_OHM_MM2_PER_M,
    REACTANCE_THRESHOLD_MM2,
    REFERENCE_AMBIENT_TEMP_C,
    MINIMAL_PHASE_VOLTAGE_V,
    MIN_SECTION_BY_BREAKER,
    BASE_CAPACITY_COPPER_A,
    TEMPERATURE_FACTORS,
    GROUPING_FACTORS
}