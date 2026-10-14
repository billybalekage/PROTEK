"use strict";

const errorHandler = require("../middlewares/errorHandler");
const { ERROR_CODES, NormativeError } = require("../shared/errors/errors");

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
});
