"use strict";

const { prisma } = require("../../../shared/infra/prisma");

const db = (tx) => tx || prisma;

const create = ({ userId, sessionId, familyId, tokenHash, expiresAt }, tx) =>
  db(tx).refreshToken.create({
    data: { userId, sessionId, familyId, tokenHash, expiresAt },
  });

const findByHash = (tokenHash, tx) =>
  db(tx).refreshToken.findUnique({ where: { tokenHash } });

const consumeActive = async (tokenHash, now, tx) => {
  const client = db(tx);
  const { count } = await client.refreshToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });
  if (count !== 1) return null;
  return client.refreshToken.findUnique({ where: { tokenHash } });
};

const revokeFamily = (familyId, now, tx) =>
  db(tx).refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: now },
  });

const revokeBySession = (sessionId, now, tx) =>
  db(tx).refreshToken.updateMany({
    where: { sessionId, revokedAt: null },
    data: { revokedAt: now },
  });

const revokeAllForUser = (userId, now, { exceptSessionId } = {}, tx) =>
  db(tx).refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId && { sessionId: { not: exceptSessionId } }),
    },
    data: { revokedAt: now },
  });

const deleteExpired = (before, tx) =>
  db(tx).refreshToken.deleteMany({ where: { expiresAt: { lt: before } } });

module.exports = {
  create,
  findByHash,
  consumeActive,
  revokeFamily,
  revokeBySession,
  revokeAllForUser,
  deleteExpired,
};
