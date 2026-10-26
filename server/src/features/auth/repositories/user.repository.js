"use strict";

const { prisma } = require("../../../shared/infra/prisma");
const { EmailAlreadyUsedError } = require("../../../shared/errors/auth.error");

const db = (tx) => tx || prisma;

const PUBLIC_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  accountType: true,
  status: true,
  emailVerifiedAt: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
};

const AUTH_SELECT = {
  ...PUBLIC_SELECT,
  passwordHash: true,
  googleId: true,
  totpSecretEncrypted: true,
  failedLoginCount: true,
  lastFailedLoginAt: true,
  lockoutLevel: true,
  lockedUntil: true,
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const isEmailConflict = (err) =>
  err && err.code === "P2002" && String(err.meta?.target ?? "").includes("email");

const findById = (id, tx) =>
  db(tx).user.findUnique({ where: { id }, select: PUBLIC_SELECT });

const findAuthById = (id, tx) =>
  db(tx).user.findUnique({ where: { id }, select: AUTH_SELECT });

const findAuthByEmail = (email, tx) =>
  db(tx).user.findUnique({
    where: { email: normalizeEmail(email) },
    select: AUTH_SELECT,
  });

const findPublicByEmail = (email, tx) =>
  db(tx).user.findUnique({
    where: { email: normalizeEmail(email) },
    select: PUBLIC_SELECT,
  });

const create = async ({ fullName, email, phone, passwordHash }, tx) => {
  try {
    return await db(tx).user.create({
      data: { fullName, email: normalizeEmail(email), phone, passwordHash },
      select: PUBLIC_SELECT,
    });
  } catch (err) {
    if (isEmailConflict(err)) throw new EmailAlreadyUsedError();
    throw err;
  }
};

const markEmailVerified = async (userId, now, tx) => {
  const { count } = await db(tx).user.updateMany({
    where: { id: userId, status: "PENDING_VERIFICATION" },
    data: { status: "ACTIVE", emailVerifiedAt: now },
  });
  return count === 1;
};

const updatePasswordHash = (userId, passwordHash, tx) =>
  db(tx).user.update({
    where: { id: userId },
    data: { passwordHash },
    select: { id: true },
  });

const updateEmail = async (userId, newEmail, now, tx) => {
  try {
    return await db(tx).user.update({
      where: { id: userId },
      data: { email: normalizeEmail(newEmail), emailVerifiedAt: now },
      select: PUBLIC_SELECT,
    });
  } catch (err) {
    if (isEmailConflict(err)) throw new EmailAlreadyUsedError();
    throw err;
  }
};

const registerFailedLogin = async (userId, { now, resetAfterMs }, tx) => {
  const client = db(tx);
  await client.user.updateMany({
    where: {
      id: userId,
      lastFailedLoginAt: { lt: new Date(now.getTime() - resetAfterMs) },
    },
    data: { failedLoginCount: 0 },
  });
  return client.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 }, lastFailedLoginAt: now },
    select: { failedLoginCount: true, lastFailedLoginAt: true, lockoutLevel: true },
  });
};

const lockAccount = (userId, { lockedUntil, level }, tx) =>
  db(tx).user.update({
    where: { id: userId },
    data: { lockedUntil, lockoutLevel: level, failedLoginCount: 0 },
    select: { lockedUntil: true, lockoutLevel: true },
  });

const clearLoginFailures = (userId, tx) =>
  db(tx).user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
      lockoutLevel: 0,
    },
    select: { id: true },
  });

module.exports = {
  findById,
  findAuthById,
  findAuthByEmail,
  findPublicByEmail,
  create,
  markEmailVerified,
  updatePasswordHash,
  updateEmail,
  registerFailedLogin,
  lockAccount,
  clearLoginFailures,
};
