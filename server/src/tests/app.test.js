"use strict";

Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@localhost:5432/protek_test?schema=public",
  JWT_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGINS: "http://localhost:3000",
  SWAGGER_ENABLED: "false",
});

const request = require("supertest");
const app = require("../app/app");

describe("API application", () => {
  test("GET /health returns the service status and request ID", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toBeDefined();
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  test("unknown routes return the standard 404 response", async () => {
    const response = await request(app).get("/does-not-exist").expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  test("async route errors reach the error handler without exposing a stack", async () => {
    const response = await request(app)
      .get("/_debug/async-error")
      .expect(500);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur interne du serveur.",
      },
    });
    expect(response.body.error.stack).toBeUndefined();
  });
});
