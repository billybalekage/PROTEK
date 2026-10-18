'use strict'

const { NormativeError, NORMATIVE_ERROR_CODES } = require("../shared/normative-error")
const { STANDARD_BREAKER_RATTINGS_A} = require("./constants")

const EPSILON = 1e-9

/**
 * @param {number} ibA
 * @returns {number} In (A)
 * @throws {NormativeError} EXCEEDING_BREAKER_RANGE
 */

function selectBreakerRating(ibA) {
    const rating = STANDARD_BREAKER_RATTINGS_A.find((r) => r >= ibA - EPSILON)
    if (rating === undefined) {
        const max = STANDARD_BREAKER_RATTINGS_A[STANDARD_BREAKER_RATTINGS_A.length - 1]
        throw new NormativeError(
            NORMATIVE_ERROR_CODES.EXCEEDING_BREAKER_RANGE, 
            `Le courant d'emploie Ib = ${ibA.toFixed(2)} A dépasse le plus grand calibre residentiel disponible (${max} A), Scindez le circuit ou passer en etude tertaire/industrielle`,
            { reference: 'NF C 15-100 paragraphe 433 - CEI 60364-4-43', details: { ibA, maxRtingA: max}}
        )
    }

    return rating
}

module.exports = {selectBreakerRating, EPSILON}