"use strict";

const { prisma } = require("../../../shared/infra/prisma");

const db = (tx) => tx || prisma;

const add = (jti, expiresAt, tx) =>
  db(tx).revokedAccessToken.createMany({
    data: [{ jti, expiresAt }],
    skipDuplicates: true,
  });

const isRevoked = async (jti, tx) =>
  (await db(tx).revokedAccessToken.count({ where: { jti } })) > 0;

const deleteExpired = (now, tx) =>
  db(tx).revokedAccessToken.deleteMany({ where: { expiresAt: { lt: now } } });

module.exports = { add, isRevoked, deleteExpired };
