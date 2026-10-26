"use strict";

const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  otpCode: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  revokedAccessToken: {
    createMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

jest.mock("../shared/infra/prisma", () => ({ prisma: mockPrisma }));

const userRepository = require("../features/auth/repositories/user.repository");
const sessionRepository = require("../features/auth/repositories/session.repository");
const refreshTokenRepository = require("../features/auth/repositories/refreshToken.repository");
const otpRepository = require("../features/auth/repositories/otp.repository");
const revokedTokenRepository = require("../features/auth/repositories/revokedToken.repository");
const auditRepository = require("../shared/audit/audit.repository");
const { EmailAlreadyUsedError } = require("../shared/errors/auth.error");

describe("auth repositories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes emails and returns only public user fields by default", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });

    await userRepository.findPublicByEmail("  USER@EXAMPLE.COM ");

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      select: expect.objectContaining({
        id: true,
        email: true,
        twoFactorEnabled: true,
      }),
    });
    expect(mockPrisma.user.findUnique.mock.calls[0][0].select).not.toHaveProperty(
      "passwordHash",
    );
  });

  test("maps unique-email conflicts from user creation", async () => {
    mockPrisma.user.create.mockRejectedValue({
      code: "P2002",
      meta: { target: ["email"] },
    });

    await expect(
      userRepository.create({
        fullName: "Test User",
        email: "USER@EXAMPLE.COM",
        phone: "+243812345678",
        passwordHash: "hash",
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
    expect(mockPrisma.user.create.mock.calls[0][0].data).toEqual({
      fullName: "Test User",
      email: "user@example.com",
      phone: "+243812345678",
      passwordHash: "hash",
    });
  });

  test("only activates an account pending email verification", async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
    const now = new Date();

    await expect(userRepository.markEmailVerified("user-1", now)).resolves.toBe(
      false,
    );
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", status: "PENDING_VERIFICATION" },
      data: { status: "ACTIVE", emailVerifiedAt: now },
    });
  });

  test("scopes session revocation to the owning user", async () => {
    mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
    const now = new Date();

    await expect(
      sessionRepository.revokeOne("session-1", "user-1", now),
    ).resolves.toBe(true);
    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        userId: "user-1",
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  });

  test("atomically consumes only an active refresh token", async () => {
    const now = new Date();
    const token = { id: "token-1", usedAt: now };
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(token);

    await expect(
      refreshTokenRepository.consumeActive("hash", now),
    ).resolves.toBe(token);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: "hash",
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
  });

  test("atomically consumes OTP codes once", async () => {
    const now = new Date();
    mockPrisma.otpCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(otpRepository.consume("otp-1", now)).resolves.toBe(false);
    expect(mockPrisma.otpCode.updateMany).toHaveBeenCalledWith({
      where: { id: "otp-1", consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
  });

  test("records audit events without requiring an identified user", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });

    await auditRepository.record({
      action: "LOGIN_FAILED",
      ipAddress: "127.0.0.1",
      details: { reason: "unknown_user" },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "LOGIN_FAILED",
        userId: null,
        projectId: null,
        ipAddress: "127.0.0.1",
        details: { reason: "unknown_user" },
      },
      select: { id: true },
    });
  });

  test("stores revoked token identifiers idempotently", async () => {
    const expiresAt = new Date();
    await revokedTokenRepository.add("jti-1", expiresAt);

    expect(mockPrisma.revokedAccessToken.createMany).toHaveBeenCalledWith({
      data: [{ jti: "jti-1", expiresAt }],
      skipDuplicates: true,
    });
  });
});
