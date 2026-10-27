"use strict";

const { lockout: config } = require("../../../config/auth.config");

const isLocked = (user, now) =>
  Boolean(user.lockedUntil && user.lockedUntil > now);

const isCaptchaRequired = (user, now) => {
  if (user.lockoutLevel > 0) return true;
  if (user.failedLoginCount < config.captchaAfterFailures) return false;
  return (
    Boolean(user.lastFailedLoginAt) &&
    now.getTime() - user.lastFailedLoginAt.getTime() <=
      config.resetFailuresAfterMs
  );
};

const evaluateAfterFailure = ({ failedLoginCount, lockoutLevel }, now) => {
  if (failedLoginCount < config.criticalFailures) return { lock: null };

  const index = Math.min(lockoutLevel, config.levelsMs.length - 1);
  const durationMs = config.levelsMs[index];

  return {
    lock: {
      durationMs,
      lockedUntil: new Date(now.getTime() + durationMs),
      level: Math.min(lockoutLevel + 1, config.levelsMs.length),
    },
  };
};

module.exports = { isLocked, isCaptchaRequired, evaluateAfterFailure };
