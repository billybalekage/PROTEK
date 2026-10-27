"use strict";

process.env.JWT_ACCESS_SECRET = "x".repeat(48);

jest.mock("../../../shared/infra/prisma", () => ({
  prisma: {},
  runInTransaction: jest.fn((callback) => callback({})),
}));
jest.mock("../repositories/refreshToken.repository");
jest.mock("../repositories/session.repository");
jest.mock("../repositories/user.repository");
jest.mock("../providers/tokenBlacklist");
jest.mock("../../../shared/audit/audit.repository");

const refreshRepository = require("../repositories/refreshToken.repository");
const sessionRepository = require("../repositories/session.repository");
const userRepository = require("../repositories/user.repository");
const blacklist = require("../providers/tokenBlacklist");
const auditRepository = require("../../../shared/audit/audit.repository");
const { signAccessToken } = require("../providers/jwt.provider");
const service = require("../services/token.service");

const NOW = new Date("2026-10-26T10:00:00Z");
const expiresAt = new Date(NOW.getTime() + 60 * 60 * 1000);
const user = { id: "u1", email: "user@example.cd", status: "ACTIVE" };
const token = {
  userId: "u1",
  sessionId: "s1",
  familyId: "f1",
  usedAt: null,
  revokedAt: null,
  expiresAt,
};

beforeEach(() => {
  jest.clearAllMocks();
  refreshRepository.consumeActive.mockResolvedValue(null);
  refreshRepository.findByHash.mockResolvedValue(null);
  refreshRepository.create.mockResolvedValue({});
  sessionRepository.create.mockResolvedValue({ id: "s1" });
  sessionRepository.findActiveById.mockResolvedValue({
    id: "s1",
    userId: "u1",
    user: { status: "ACTIVE" },
  });
  sessionRepository.touch.mockResolvedValue({ count: 1 });
  sessionRepository.revokeOne.mockResolvedValue(true);
  userRepository.findById.mockResolvedValue(user);
});

describe("rotateRefreshToken", () => {
  test("rotates an active refresh token within its family", async () => {
    refreshRepository.consumeActive.mockResolvedValue(token);

    const result = await service.rotateRefreshToken("presented", { now: NOW });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).not.toBe("presented");
    expect(refreshRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: "f1", sessionId: "s1" }),
      expect.anything(),
    );
  });

  test("rejects an unknown refresh token", async () => {
    await expect(
      service.rotateRefreshToken("unknown", { now: NOW }),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  test("reissues within the network grace period without revoking the session", async () => {
    refreshRepository.findByHash.mockResolvedValue({
      ...token,
      usedAt: new Date(NOW.getTime() - 2000),
    });

    const result = await service.rotateRefreshToken("presented", { now: NOW });

    expect(result.refreshToken).toEqual(expect.any(String));
    expect(refreshRepository.revokeFamily).toHaveBeenCalledWith(
      "f1",
      NOW,
      expect.anything(),
    );
    expect(sessionRepository.revokeOne).not.toHaveBeenCalled();
  });

  test("revokes a reused token family and active session after the grace period", async () => {
    refreshRepository.findByHash.mockResolvedValue({
      ...token,
      usedAt: new Date(NOW.getTime() - 60 * 1000),
    });

    await expect(
      service.rotateRefreshToken("presented", {
        now: NOW,
        ipAddress: "127.0.0.1",
      }),
    ).rejects.toMatchObject({ code: "TOKEN_REUSE_DETECTED" });

    expect(refreshRepository.revokeFamily).toHaveBeenCalledWith(
      "f1",
      NOW,
      expect.anything(),
    );
    expect(sessionRepository.revokeOne).toHaveBeenCalledWith(
      "s1",
      "u1",
      NOW,
      expect.anything(),
    );
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REFRESH_REUSE_DETECTED" }),
    );
  });

  test("does not audit a replay after the session is already closed", async () => {
    refreshRepository.findByHash.mockResolvedValue({
      ...token,
      usedAt: new Date(NOW.getTime() - 60 * 1000),
    });
    sessionRepository.revokeOne.mockResolvedValue(false);

    await expect(
      service.rotateRefreshToken("presented", { now: NOW }),
    ).rejects.toMatchObject({ code: "TOKEN_REUSE_DETECTED" });
    expect(auditRepository.record).not.toHaveBeenCalled();
  });

  test("rejects refresh when the user is suspended or the session is inactive", async () => {
    refreshRepository.consumeActive.mockResolvedValue(token);
    userRepository.findById.mockResolvedValue({ ...user, status: "SUSPENDED" });

    await expect(
      service.rotateRefreshToken("presented", { now: NOW }),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
    expect(refreshRepository.create).not.toHaveBeenCalled();

    userRepository.findById.mockResolvedValue(user);
    sessionRepository.findActiveById.mockResolvedValue(null);
    await expect(
      service.rotateRefreshToken("presented", { now: NOW }),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });
});

describe("session tokens and access authentication", () => {
  test("creates a session and emits an access/refresh token pair", async () => {
    const result = await service.startSession({ user, now: NOW });

    expect(sessionRepository.create).toHaveBeenCalledWith(
      { userId: "u1" },
      expect.anything(),
    );
    expect(result).toMatchObject({
      sessionId: "s1",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      accessTokenExpiresAt: expect.any(Date),
      refreshTokenExpiresAt: expect.any(Date),
    });
  });

  test("logs out a session and blacklists the access token identifier", async () => {
    const access = {
      userId: "u1",
      sessionId: "s1",
      jti: "j1",
      expiresAt,
    };
    await service.logout({ access }, { now: NOW });

    expect(sessionRepository.revokeOne).toHaveBeenCalledWith(
      "s1",
      "u1",
      NOW,
      expect.anything(),
    );
    expect(refreshRepository.revokeBySession).toHaveBeenCalledWith(
      "s1",
      NOW,
      expect.anything(),
    );
    expect(blacklist.revoke).toHaveBeenCalledWith("j1", expiresAt);
  });

  test("authenticates signed access tokens only for active, non-blacklisted sessions", async () => {
    blacklist.isRevoked.mockResolvedValue(false);
    const accessToken = signAccessToken({
      userId: "u1",
      email: user.email,
      sessionId: "s1",
    }).token;

    await expect(
      service.authenticateAccessToken(accessToken),
    ).resolves.toMatchObject({ userId: "u1", sessionId: "s1" });

    blacklist.isRevoked.mockResolvedValue(true);
    await expect(
      service.authenticateAccessToken(accessToken),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  test("rejects access tokens for suspended accounts even if their session is active", async () => {
    blacklist.isRevoked.mockResolvedValue(false);
    sessionRepository.findActiveById.mockResolvedValue({
      id: "s1",
      userId: "u1",
      user: { status: "SUSPENDED" },
    });
    const accessToken = signAccessToken({
      userId: "u1",
      email: user.email,
      sessionId: "s1",
    }).token;

    await expect(
      service.authenticateAccessToken(accessToken),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });
});
