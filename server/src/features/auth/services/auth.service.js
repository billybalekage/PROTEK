"use strict";

const { runInTransaction } = require("../../../shared/infra/prisma");
const logger = require("../../../config/logger");
const auditService = require("../../../shared/audit/audit.service");
const ValidationError = require("../../../shared/errors/validator.error");
const {
  InvalidCredentialsError,
  AccountLockedError,
  CaptchaRequiredError,
  EmailNotVerifiedError,
  AccountSuspendedError,
  EmailAlreadyUsedError,
  OtpInvalidError,
  TwoFactorRequiredError,
} = require("../../../shared/errors/auth.error");
const userRepository = require("../repositories/user.repository");
const sessionRepository = require("../repositories/session.repository");
const otpService = require("./otp.service");
const lockoutService = require("./lockout.service");
const tokenService = require("./token.service");
const authMailer = require("./authMailer.service");
const captcha = require("../providers/captcha.provider");
const {
  hashPassword,
  verifyPassword,
} = require("../providers/hash.provider");
const { evaluatePassword } = require("../policies/password.policy");

const PURPOSE = Object.freeze({
  VERIFY: "EMAIL_VERIFICATION",
  RESET: "PASSWORD_RESET",
});

const audit = auditService.record;

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  accountType: user.accountType,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt,
  twoFactorEnabled: user.twoFactorEnabled,
});

const sendVerificationCode = async (user, now) => {
  const result = await otpService.issue({
    userId: user.id,
    purpose: PURPOSE.VERIFY,
    now,
  });
  if (result.issued) authMailer.sendEmailVerification(user, result);
  return result.issued;
};

const signup = async (
  { fullName, email, phone, password },
  { ipAddress, now = new Date() } = {},
) => {
  const violations = evaluatePassword(password, { email, fullName });
  if (violations.length > 0) {
    throw new ValidationError(
      violations.map(({ message }) => ({ field: "password", message })),
    );
  }

  const passwordHash = await hashPassword(password);
  let created = null;
  try {
    created = await userRepository.create({
      fullName,
      email,
      phone,
      passwordHash,
    });
  } catch (err) {
    if (!(err instanceof EmailAlreadyUsedError)) throw err;
  }

  if (created) {
    await audit({ action: "SIGNUP", userId: created.id, ipAddress });
    await sendVerificationCode(created, now);
  } else {
    const existing = await userRepository.findPublicByEmail(email);
    if (existing?.status === "PENDING_VERIFICATION") {
      await sendVerificationCode(existing, now);
    } else if (existing) {
      authMailer.sendAccountAlreadyExists(existing);
    }
  }

  return { status: "VERIFICATION_PENDING" };
};

const verifyEmail = async (
  { email, code },
  { ipAddress, now = new Date() } = {},
) => {
  const user = await userRepository.findPublicByEmail(email);
  if (!user || user.status !== "PENDING_VERIFICATION") {
    throw new OtpInvalidError();
  }

  const otp = await otpService.verifyCode({
    userId: user.id,
    purpose: PURPOSE.VERIFY,
    code,
    now,
  });

  await runInTransaction(async (tx) => {
    await otpService.consumeCode(otp.id, now, tx);
    const verified = await userRepository.markEmailVerified(user.id, now, tx);
    if (!verified) throw new OtpInvalidError();
  });

  await audit({ action: "EMAIL_VERIFIED", userId: user.id, ipAddress });
  return { status: "VERIFIED" };
};

const resendVerification = async ({ email }, { now = new Date() } = {}) => {
  const user = await userRepository.findPublicByEmail(email);
  if (user?.status === "PENDING_VERIFICATION") {
    await sendVerificationCode(user, now);
  }
  return { status: "IF_ELIGIBLE_CODE_SENT" };
};

const login = async (
  { email, password, captchaToken },
  { ipAddress, userAgent, now = new Date() } = {},
) => {
  const user = await userRepository.findAuthByEmail(email);

  if (!user) {
    await verifyPassword(password, null);
    await audit({
      action: "LOGIN_FAILED",
      ipAddress,
      details: { reason: "UNKNOWN_EMAIL" },
    });
    throw new InvalidCredentialsError();
  }

  lockoutService.assertNotLocked(user, now);
  if (lockoutService.isCaptchaRequired(user, now)) {
    const verified = await captcha.verify(captchaToken, ipAddress);
    if (!verified) throw new CaptchaRequiredError();
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    const failure = await lockoutService.recordFailure(user, {
      ipAddress,
      now,
    });
    await audit({
      action: "LOGIN_FAILED",
      userId: user.id,
      ipAddress,
      details: { reason: "BAD_PASSWORD" },
    });
    if (failure.locked) throw new AccountLockedError(failure.lockedUntil);
    throw new InvalidCredentialsError({
      captchaRequired: failure.captchaRequired,
    });
  }

  if (user.status === "PENDING_VERIFICATION") {
    await sendVerificationCode(user, now);
    throw new EmailNotVerifiedError();
  }
  if (user.status !== "ACTIVE") throw new AccountSuspendedError();

  if (user.twoFactorEnabled) {
    throw new TwoFactorRequiredError();
  }

  if (user.failedLoginCount > 0 || user.lockoutLevel > 0 || user.lockedUntil) {
    await lockoutService.clearOnSuccess(user.id);
  }

  const footprint = await sessionRepository.deviceFootprint(user.id, userAgent);
  const tokens = await tokenService.startSession({
    user,
    device: { userAgent, ipAddress },
    now,
  });
  await audit({
    action: "LOGIN_SUCCESS",
    userId: user.id,
    ipAddress,
    details: { sessionId: tokens.sessionId },
  });

  if (footprint.total > 0 && footprint.matching === 0) {
    authMailer.sendNewDeviceLogin(user, { userAgent, ipAddress, at: now });
  }

  return { user: toPublicUser(user), tokens };
};

const forgotPassword = async (
  { email },
  { ipAddress, now = new Date() } = {},
) => {
  const user = await userRepository.findPublicByEmail(email);
  if (user?.status === "ACTIVE") {
    const result = await otpService.issue({
      userId: user.id,
      purpose: PURPOSE.RESET,
      now,
    });
    if (result.issued) {
      authMailer.sendPasswordReset(user, result);
      await audit({
        action: "PASSWORD_RESET_REQUESTED",
        userId: user.id,
        ipAddress,
      });
    }
  }
  return { status: "IF_ACCOUNT_EXISTS_CODE_SENT" };
};

const resetPassword = async (
  { email, code, newPassword },
  { ipAddress, now = new Date() } = {},
) => {
  const user = await userRepository.findAuthByEmail(email);
  if (!user || user.status !== "ACTIVE") throw new OtpInvalidError();

  const violations = evaluatePassword(newPassword, {
    email: user.email,
    fullName: user.fullName,
  });
  if (violations.length > 0) {
    throw new ValidationError(
      violations.map(({ message }) => ({ field: "newPassword", message })),
    );
  }

  const otp = await otpService.verifyCode({
    userId: user.id,
    purpose: PURPOSE.RESET,
    code,
    now,
  });
  const passwordHash = await hashPassword(newPassword);

  await runInTransaction(async (tx) => {
    await otpService.consumeCode(otp.id, now, tx);
    await userRepository.updatePasswordHash(user.id, passwordHash, tx);
    await tokenService.revokeAllSessions(user.id, { now }, tx);
    await userRepository.clearLoginFailures(user.id, tx);
  });

  await audit({
    action: "PASSWORD_RESET_COMPLETED",
    userId: user.id,
    ipAddress,
  });
  authMailer.sendPasswordChanged(user);
  return { status: "PASSWORD_UPDATED" };
};

module.exports = {
  signup,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
};
