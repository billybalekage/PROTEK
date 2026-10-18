"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app/app");
const { env } = require("../config/env");

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
    const response = await request(app).get("/_debug/async-error").expect(500);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur interne du serveur.",
      },
    });
    expect(response.body.error.stack).toBeUndefined();
  });

  test("versioned API rejects requests without a verified bearer token", async () => {
    const response = await request(app)
      .get("/api/v1/projects")
      .set("X-Tenant-Id", "spoofed-tenant")
      .expect(401);

    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  test("versioned API rejects authenticated tokens without a tenant claim", async () => {
    const token = jwt.sign({}, env.jwt.secret, { subject: "user-1" });
    const response = await request(app)
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe("TENANT_CONTEXT_REQUIRED");
  });

  test("versioned API accepts a signed tenant context before route lookup", async () => {
    const token = jwt.sign({ tenantId: "tenant-1" }, env.jwt.secret, {
      subject: "user-1",
    });

    await request(app)
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
