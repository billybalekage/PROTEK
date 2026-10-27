"use strict";

const { lockout: config } = require("../../../config/auth.config");
const logger = require("../../../config/logger");
const { AccountLockedError } = require("../../../shared/errors/auth.error");
const auditService = require("../../../shared/audit/audit.service");
const userRepository = require("../repositories/user.repository");
const policy = require("../policies/lockout.policy");

const assertNotLocked = (user, now = new Date()) => {
  if (policy.isLocked(user, now)) {
    throw new AccountLockedError(user.lockedUntil);
  }
};

const isCaptchaRequired = (user, now = new Date()) =>
  policy.isCaptchaRequired(user, now);

const recordFailure = async (user, { ipAddress, now = new Date() } = {}) => {
  const stats = await userRepository.registerFailedLogin(user.id, {
    now,
    resetAfterMs: config.resetFailuresAfterMs,
  });
  const { lock } = policy.evaluateAfterFailure(stats, now);

  if (lock) {
    await userRepository.lockAccount(user.id, {
      lockedUntil: lock.lockedUntil,
      level: lock.level,
    });
    try {
      await auditService.record({
        action: "ACCOUNT_LOCKED",
        userId: user.id,
        ipAddress,
        details: {
          level: lock.level,
          lockedUntil: lock.lockedUntil.toISOString(),
        },
      });
    } catch (error) {
      logger.warn({ err: error }, "Failed to record account lock audit event");
    }
  }

  return {
    locked: Boolean(lock),
    lockedUntil: lock ? lock.lockedUntil : null,
    captchaRequired:
      Boolean(lock) || policy.isCaptchaRequired(stats, now),
  };
};

const clearOnSuccess = (userId, tx) =>
  userRepository.clearLoginFailures(userId, tx);

module.exports = {
  assertNotLocked,
  isCaptchaRequired,
  recordFailure,
  clearOnSuccess,
};
