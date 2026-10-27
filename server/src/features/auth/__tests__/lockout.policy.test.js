"use strict";

const policy = require("../policies/lockout.policy");

const NOW = new Date("2026-10-26T10:00:00Z");
const MINUTE = 60 * 1000;
const ago = (ms) => new Date(NOW.getTime() - ms);

describe("lockout policy", () => {
  test.each([
    [{ lockedUntil: null }, false],
    [{ lockedUntil: ago(1) }, false],
    [{ lockedUntil: new Date(NOW.getTime() + MINUTE) }, true],
  ])("determines whether the account is locked", (user, expected) => {
    expect(policy.isLocked(user, NOW)).toBe(expected);
  });

  const user = {
    failedLoginCount: 0,
    lastFailedLoginAt: null,
    lockoutLevel: 0,
  };

  test("requires CAPTCHA only after three recent failures", () => {
    expect(
      policy.isCaptchaRequired(
        { ...user, failedLoginCount: 2, lastFailedLoginAt: ago(1000) },
        NOW,
      ),
    ).toBe(false);
    expect(
      policy.isCaptchaRequired(
        { ...user, failedLoginCount: 3, lastFailedLoginAt: ago(5000) },
        NOW,
      ),
    ).toBe(true);
    expect(
      policy.isCaptchaRequired(
        { ...user, failedLoginCount: 4, lastFailedLoginAt: ago(60 * MINUTE) },
        NOW,
      ),
    ).toBe(false);
  });

  test("keeps requiring CAPTCHA after lockout until a successful login", () => {
    expect(policy.isCaptchaRequired({ ...user, lockoutLevel: 1 }, NOW)).toBe(
      true,
    );
  });

  test("applies progressive lockout durations and caps the level", () => {
    const durations = [15 * MINUTE, 60 * MINUTE, 24 * 60 * MINUTE, 24 * 60 * MINUTE];

    durations.forEach((durationMs, lockoutLevel) => {
      const { lock } = policy.evaluateAfterFailure(
        { failedLoginCount: 5, lockoutLevel },
        NOW,
      );
      expect(lock.durationMs).toBe(durationMs);
      expect(lock.level).toBe(Math.min(lockoutLevel + 1, 3));
      expect(lock.lockedUntil.getTime()).toBe(NOW.getTime() + durationMs);
    });

    expect(
      policy.evaluateAfterFailure({ failedLoginCount: 4, lockoutLevel: 0 }, NOW)
        .lock,
    ).toBeNull();
  });
});
