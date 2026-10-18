'use strict'

const { NormativeError, NORMATIVE_ERROR_CODES } = require("../shared/normative-error")


function assertPositive(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new NormativeError(
            NORMATIVE_ERROR_CODES.INVALID_INPUT,
            `Valeur invalide pour  ${name} : Un nombre strictement positif est attendu (reçu L ${value})`,
            { details: { field: name, value}}
        )
    }
}


/**
 * 
 * @param {object} p
 * @param {number} p.powerW
 * @param {number} p.voltageV
 * @param {1|3} p.phases
 * @param {number} [p.cosPhi=1]
 * @param {number} [p.utilisationFacteur=1]
 * @param {number} [p.simultaneityFactor=1]
 * @param {number} Ib en ampere
 */

function calculateDesignCurrent({
    powerW, 
    voltageV, cosPhi=1, utilisationFacteur=1, simultaneityFactor=1
}) {
    assertPositive(powerW, 'powerW')
    assertPositive(voltageV, 'voltageV')
    assertPositive(utilisationFacteur, 'utilisationFacteur')
    assertPositive(simultaneityFactor, 'simultaneityFactor')
    assertPositive(cosPhi, 'cosPhi')

    if (phases !== 1 && phases !== 3) {
        throw new NormativeError(
            NORMATIVE_ERROR_CODES.INVALID_INPUT,
            'Le nombre de phases doit etre 1 ( monophasé) ou 3 (Triphasé)',
            {details: {field: 'phases', value: phases}}
        )
    }

    if (cosPhi > 1 || utilisationFacteur > 1 || simultaneityFactor > 1) {
        throw new NormativeError(
            NORMATIVE_ERROR_CODES.INVALID_INPUT, 
            'CosPhi, Ku, ks doivent etre compris entre 0 (EXCLU) et 1',
            {details: {cosPhi, utilisationFacteur, simultaneityFactor}}
        )
    }

    const effectivePower = powerW * utilisationFacteur * simultaneityFactor;
    const divisor = (phases === 3 ? Math.sqrt(3) :1 ) * voltageV * cosPhi

    return Math.round((effectivePower / divisor) * 1e6) / 1e6
}

module.exports = {calculateDesignCurrent, assertPositive}