'use strict'

const NORMATIVE_ERROR_CODES = Object.freeze({
  INVALID_INPUT: "INVALID INPUT",
  VOLTAGE_DROP_EXCEEDED: "VOLTAGE_DROP_EXCEEDED",
  EXCEEDING_CABLE_CAPACITY: "EXCEEDING_CABLE_CAPACITY",
  EXCEEDING_BREAKER_RANGE: "EXCEEDING_BREAKER_RANGE",
  CABLE_NOT_PROTECTED: "CABLE_NOT_PROTECTED",
  TEMPERATURE_OUT_OF_RANGE: "TEMPERATURE_OUT_OF_RANGE",
  DDR_CAPACITY_EXCEEDED: "DDR_CAPACITY_EXCEEDED"
});

class NormativeError extends Error {
    /**
     * @param {string } code  code de NORMATIVE_ERROR_CODES
     * @param {string}  message
     * @param {reference?: string|null, details?: object}
     */

    constructor(code, message, {reference = null, details ={}} ={}) {
        super(message)
        this.name = 'NormativeError'
        this.code = code
        this.reference = reference
        this.details = details
    }
}

module.exports = {NormativeError, NORMATIVE_ERROR_CODES}