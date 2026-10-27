"use strict";

const { otp: config } = require("../../../config/auth.config");
const { OtpInvalidError } = require("../../../shared/errors/auth.error");
const otpRepository = require("../repositories/otp.repository");
const {
  generateOtp,
  hmacOtp,
  safeEqual,
} = require("../providers/hash.provider");

const HOUR = 60 * 60 * 1000;

const issue = async ({ userId, purpose, target, now = new Date() }) => {
  const lastSentAt = await otpRepository.findLastCreatedAt(userId, purpose);
  if (lastSentAt) {
    const retryAfterMs =
      config.resendCooldownMs - (now.getTime() - lastSentAt.getTime());
    if (retryAfterMs > 0) {
      return { issued: false, reason: "COOLDOWN", retryAfterMs };
    }
  }

  const sentLastHour = await otpRepository.countCreatedSince(
    userId,
    purpose,
    new Date(now.getTime() - HOUR),
  );
  if (sentLastHour >= config.maxPerHour) {
    return { issued: false, reason: "RATE_LIMITED", retryAfterMs: HOUR };
  }

  await otpRepository.invalidateActive(userId, purpose, now);

  const code = generateOtp(config.length);
  const expiresAt = new Date(now.getTime() + config.ttlMs);
  await otpRepository.create({
    userId,
    purpose,
    codeHash: hmacOtp({ userId, purpose, code }),
    target,
    expiresAt,
  });

  return { issued: true, code, expiresAt };
};

const verifyCode = async ({ userId, purpose, code, now = new Date() }) => {
  const otp = await otpRepository.findLatestActive(userId, purpose, now);
  if (!otp) throw new OtpInvalidError();

  const attempts = await otpRepository.incrementAttempts(otp.id);
  if (attempts > config.maxAttempts) {
    await otpRepository.consume(otp.id, now);
    throw new OtpInvalidError();
  }

  const matches = safeEqual(
    hmacOtp({ userId, purpose, code }),
    otp.codeHash,
  );
  if (!matches) {
    if (attempts >= config.maxAttempts) {
      await otpRepository.consume(otp.id, now);
    }
    throw new OtpInvalidError();
  }

  return { id: otp.id, target: otp.target };
};

const consumeCode = async (otpId, now, tx) => {
  const consumed = await otpRepository.consume(otpId, now, tx);
  if (!consumed) throw new OtpInvalidError();
};

module.exports = { issue, verifyCode, consumeCode };
