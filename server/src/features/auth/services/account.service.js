"use strict";

const { runInTransaction } = require("../../../shared/infra/prisma");
const audit = require("../../../shared/audit/audit.service");
const ValidationError = require("../../../shared/errors/validator.error");
const { NotFoundError } = require("../../../shared/errors/http.errors");
const {
  AccountLockedError,
  WrongCurrentPasswordError,
  TokenInvalidError,
  OtpInvalidError,
  EmailAlreadyUsedError,
} = require("../../../shared/errors/auth.error");
const userRepository = require("../repositories/user.repository");
const otpRepository = require("../repositories/otp.repository");
const sessionRepository = require("../repositories/session.repository");
const otpService = require("./otp.service");
const lockoutService = require("./lockout.service");
const tokenService = require("./token.service");
const authMailer = require("./authMailer.service");
const { hashPassword, verifyPassword } = require("../providers/hash.provider");
const { evaluatePassword } = require("../policies/password.policy");

const EMAIL_CHANGE = "EMAIL_CHANGE";

const assertCurrentPassword = async (
  user,
  currentPassword,
  { ipAddress, now },
) => {
  lockoutService.assertNotLocked(user, now);
  if (await verifyPassword(currentPassword, user.passwordHash)) return;

  const failure = await lockoutService.recordFailure(user, { ipAddress, now });
  await audit.record({
    action: "SENSITIVE_ACTION_BAD_PASSWORD",
    userId: user.id,
    ipAddress,
  });
  if (failure.locked) throw new AccountLockedError(failure.lockedUntil);
  throw new WrongCurrentPasswordError();
};

const loadActiveAuthUser = async (userId) => {
  const user = await userRepository.findAuthById(userId);
  if (!user || user.status !== "ACTIVE") throw new TokenInvalidError();
  return user;
};

const getMe = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new TokenInvalidError();
  return user;
};

const changePassword = async (
  { userId, sessionId, currentPassword, newPassword },
  { ipAddress, now = new Date() } = {},
) => {
  const user = await loadActiveAuthUser(userId);
  await assertCurrentPassword(user, currentPassword, { ipAddress, now });

  const violations = evaluatePassword(newPassword, {
    email: user.email,
    fullName: user.fullName,
  });
  if (violations.length > 0) {
    throw new ValidationError(
      violations.map(({ message }) => ({ field: "newPassword", message })),
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await runInTransaction(async (tx) => {
    await userRepository.updatePasswordHash(userId, passwordHash, tx);
    await tokenService.revokeAllSessions(
      userId,
      { exceptSessionId: sessionId, now },
      tx,
    );
    await otpRepository.invalidateActive(
      userId,
      "PASSWORD_RESET",
      now,
      tx,
    );
    await userRepository.clearLoginFailures(userId, tx);
  });

  await audit.record({ action: "PASSWORD_CHANGED", userId, ipAddress });
  authMailer.sendPasswordChanged(user);
  return { status: "PASSWORD_UPDATED" };
};

const requestEmailChange = async (
  { userId, newEmail, currentPassword },
  { ipAddress, now = new Date() } = {},
) => {
  const user = await loadActiveAuthUser(userId);
  await assertCurrentPassword(user, currentPassword, { ipAddress, now });

  if (newEmail === user.email) {
    throw new ValidationError([
      {
        field: "newEmail",
        message: "Cette adresse est déjà celle de votre compte.",
      },
    ]);
  }

  const taken = await userRepository.findPublicByEmail(newEmail);
  if (!taken) {
    const result = await otpService.issue({
      userId,
      purpose: EMAIL_CHANGE,
      target: newEmail,
      now,
    });
    if (result.issued) {
      authMailer.sendEmailChangeCode(
        { fullName: user.fullName, newEmail },
        result,
      );
    }
  }

  await audit.record({ action: "EMAIL_CHANGE_REQUESTED", userId, ipAddress });
  return { status: "VERIFICATION_SENT" };
};

const confirmEmailChange = async (
  { userId, sessionId, code },
  { ipAddress, now = new Date() } = {},
) => {
  const user = await loadActiveAuthUser(userId);
  const otp = await otpService.verifyCode({
    userId,
    purpose: EMAIL_CHANGE,
    code,
    now,
  });
  if (!otp.target) throw new OtpInvalidError();

  try {
    await runInTransaction(async (tx) => {
      await otpService.consumeCode(otp.id, now, tx);
      await userRepository.updateEmail(userId, otp.target, now, tx);
      await tokenService.revokeAllSessions(
        userId,
        { exceptSessionId: sessionId, now },
        tx,
      );
    });
  } catch (err) {
    if (err instanceof EmailAlreadyUsedError) {
      throw new ValidationError([
        {
          field: "code",
          message: "Cette adresse e-mail n'est plus disponible.",
        },
      ]);
    }
    throw err;
  }

  await audit.record({ action: "EMAIL_CHANGED", userId, ipAddress });
  authMailer.sendEmailChanged(
    { fullName: user.fullName, email: user.email },
    { newEmail: otp.target },
  );
  return { status: "EMAIL_UPDATED", email: otp.target };
};

const listSessions = async (userId, currentSessionId) => {
  const sessions = await sessionRepository.listActiveByUser(userId);
  return sessions.map((session) => ({
    ...session,
    current: session.id === currentSessionId,
  }));
};

const revokeSession = async (
  { userId, sessionId, currentSessionId },
  { ipAddress, now = new Date() } = {},
) => {
  const revoked = await tokenService.revokeSession(sessionId, userId, { now });
  if (!revoked) throw new NotFoundError("Session introuvable.");
  await audit.record({
    action: "SESSION_REVOKED",
    userId,
    ipAddress,
    details: { sessionId },
  });
  return { revokedCurrent: sessionId === currentSessionId };
};

const revokeOtherSessions = async (
  { userId, currentSessionId },
  { ipAddress, now = new Date() } = {},
) => {
  const revokedCount = await tokenService.revokeAllSessions(
    userId,
    { exceptSessionId: currentSessionId, now },
  );
  await audit.record({
    action: "SESSIONS_REVOKED_ALL_OTHERS",
    userId,
    ipAddress,
    details: { revokedCount },
  });
  return { revokedCount };
};

module.exports = {
  getMe,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  listSessions,
  revokeSession,
  revokeOtherSessions,
};
