"use strict";

const errorHandler = require("../middlewares/errorHandler");
const { ERROR_CODES, NormativeError } = require("../shared/errors/errors");
const {
  NormativeError: CoreNormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../core/electric-rules/shared/normative-error");

describe("NormativeError", () => {
  test("uses the central status, message, and details in the API response", () => {
    const details = { measuredPercent: 4.2, maximumPercent: 3 };
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorHandler(
      new NormativeError("VOLTAGE_DROP_EXCEEDED", details),
      { id: "request-1" },
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "VOLTAGE_DROP_EXCEEDED",
        message: ERROR_CODES.VOLTAGE_DROP_EXCEEDED.message,
        details,
        requestId: "request-1",
      },
    });
  });

  test("rejects codes not registered as normative errors", () => {
    expect(() => new NormativeError("UNAUTHORIZED")).toThrow(TypeError);
  });

  test("maps core normative errors to the HTTP response", () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const details = { ibA: 10, inA: 10, i2A: 15, izA: 10 };

    errorHandler(
      new CoreNormativeError(
        NORMATIVE_ERROR_CODES.CABLE_NOT_PROTECTED,
        "Coordination incorrecte",
        { reference: "CEI 60364-4-43", details },
      ),
      { id: "request-core" },
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "CABLE_NOT_PROTECTED",
        message: ERROR_CODES.CABLE_NOT_PROTECTED.message,
        details: { ...details, reference: "CEI 60364-4-43" },
        requestId: "request-core",
      },
    });
  });
});

describe("errorHandler", () => {
  const buildResponse = (headersSent = false) => ({
    headersSent,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  test("returns a generic 500 without req.log and without leaking details", () => {
    const response = buildResponse();

    expect(() =>
      errorHandler(
        new Error("secret interne"),
        { id: "request-2" },
        response,
        jest.fn(),
      ),
    ).not.toThrow()

    expect(response.status).toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: ERROR_CODES.INTERNAL_ERROR.message,
        details: null,
        requestId: "request-2"
      }
    })
  });
  test("delegates to Express when headers were already sent", () => {
    const response = buildResponse(true)
    const next = jest.fn()
    const error = new Error("tard");

    errorHandler(error, {id: "request-3"}, response, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(response.json).not.toHaveBeenCalled()
  })
});
