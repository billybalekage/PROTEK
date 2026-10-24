"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const { EPSILON } = require("../shared/constants");
const { STANDARD_BREAKER_RATINGS_A } = require("./constants");

/**
 * @param {number} ibA
 * @returns {number} In (A)
 * @throws {NormativeError} EXCEEDING_BREAKER_RANGE
 */

function selectBreakerRating(ibA) {
    const rating = STANDARD_BREAKER_RATINGS_A.find((r) => r >= ibA - EPSILON);
    if (rating === undefined) {
        const max = STANDARD_BREAKER_RATINGS_A[STANDARD_BREAKER_RATINGS_A.length - 1];
        throw new NormativeError(
          NORMATIVE_ERROR_CODES.EXCEEDING_BREAKER_RANGE,
          `Le courant d'emploi Ib = ${ibA.toFixed(2)} A dépasse le plus grand calibre résidentiel disponible (${max} A). Scindez le circuit ou passez à une étude tertiaire/industrielle.`,
          {
            reference: "NF C 15-100 paragraphe 433 - CEI 60364-4-43",
            details: { ibA, maxRatingA: max },
          },
        );
    }

    return rating;
}

module.exports = { selectBreakerRating };