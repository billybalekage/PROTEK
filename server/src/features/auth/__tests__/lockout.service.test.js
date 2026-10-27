"use strict";

jest.mock("../repositories/user.repository");
jest.mock("../../../shared/audit/audit.repository");

const userRepository = require("../repositories/user.repository");
const auditRepository = require("../../../shared/audit/audit.repository");
const { AccountLockedError } = require("../../../shared/errors/auth.error");
const service = require("../services/lockout.service");

const NOW = new Date("2026-10-26T10:00:00Z");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("lockout service", () => {
  test("rejects password verification while an account is locked", () => {
    const user = { lockedUntil: new Date(NOW.getTime() + 60_000) };

    expect(() => service.assertNotLocked(user, NOW)).toThrow(
      expect.objectContaining({ code: "ACCOUNT_LOCKED" }),
    );
    expect(() => service.assertNotLocked({ lockedUntil: null }, NOW)).not.toThrow();
    expect(AccountLockedError).toBeDefined();
  });

  test("records failures and locks the account at the threshold", async () => {
    const lockedUntil = new Date(NOW.getTime() + 15 * 60 * 1000);
    userRepository.registerFailedLogin.mockResolvedValue({
      failedLoginCount: 5,
      lockoutLevel: 0,
      lastFailedLoginAt: NOW,
    });
    userRepository.lockAccount.mockResolvedValue({
      lockedUntil,
      lockoutLevel: 1,
    });

    await expect(
      service.recordFailure(
        { id: "user-1" },
        { ipAddress: "127.0.0.1", now: NOW },
      ),
    ).resolves.toEqual({
      locked: true,
      lockedUntil,
      captchaRequired: true,
    });
    expect(userRepository.registerFailedLogin).toHaveBeenCalledWith("user-1", {
      now: NOW,
      resetAfterMs: expect.any(Number),
    });
    expect(userRepository.lockAccount).toHaveBeenCalledWith("user-1", {
      lockedUntil,
      level: 1,
    });
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ACCOUNT_LOCKED",
        userId: "user-1",
        ipAddress: "127.0.0.1",
      }),
    );
  });

  test("clears failures after successful authentication", async () => {
    userRepository.clearLoginFailures.mockResolvedValue({ id: "user-1" });

    await service.clearOnSuccess("user-1", "tx");

    expect(userRepository.clearLoginFailures).toHaveBeenCalledWith(
      "user-1",
      "tx",
    );
  });
});
