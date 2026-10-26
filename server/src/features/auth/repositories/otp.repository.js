"use strict";

const { prisma } = require("../../../shared/infra/prisma");

const db = (tx) => tx || prisma;

const create = ({ userId, purpose, codeHash, target, expiresAt }, tx) =>
  db(tx).otpCode.create({
    data: { userId, purpose, codeHash, target: target || null, expiresAt },
    select: { id: true, expiresAt: true },
  });

const invalidateActive = (userId, purpose, now, tx) =>
  db(tx).otpCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });

const findLatestActive = (userId, purpose, now, tx) =>
  db(tx).otpCode.findFirst({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

const incrementAttempts = async (id, tx) => {
  const row = await db(tx).otpCode.update({
    where: { id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });
  return row.attempts;
};

const consume = async (id, now, tx) => {
  const { count } = await db(tx).otpCode.updateMany({
    where: { id, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });
  return count === 1;
};

const findLastCreatedAt = async (userId, purpose, tx) => {
  const row = await db(tx).otpCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row ? row.createdAt : null;
};

const countCreatedSince = (userId, purpose, since, tx) =>
  db(tx).otpCode.count({
    where: { userId, purpose, createdAt: { gte: since } },
  });

const deleteExpired = (before, tx) =>
  db(tx).otpCode.deleteMany({ where: { expiresAt: { lt: before } } });

module.exports = {
  create,
  invalidateActive,
  findLatestActive,
  incrementAttempts,
  consume,
  findLastCreatedAt,
  countCreatedSince,
  deleteExpired,
};
