"use strict";

const { prisma } = require("../../../shared/infra/prisma");

const db = (tx) => tx || prisma;

const LIST_SELECT = {
  id: true,
  userAgent: true,
  ipAddress: true,
  approxLocation: true,
  createdAt: true,
  lastActivityAt: true,
};

const create = ({ userId, userAgent, ipAddress, approxLocation }, tx) =>
  db(tx).session.create({
    data: {
      userId,
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
      ipAddress: ipAddress || null,
      approxLocation: approxLocation || null,
    },
  });

const findActiveById = (sessionId, tx) =>
  db(tx).session.findFirst({
    where: { id: sessionId, revokedAt: null },
    select: {
      id: true,
      userId: true,
      user: { select: { status: true } },
    },
  });

const touch = (sessionId, now, tx) =>
  db(tx).session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { lastActivityAt: now },
  });

const listActiveByUser = (userId, tx) =>
  db(tx).session.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastActivityAt: "desc" },
    select: LIST_SELECT,
  });

const revokeOne = async (sessionId, userId, now, tx) => {
  const { count } = await db(tx).session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: now },
  });
  return count === 1;
};

const revokeAllForUser = async (userId, now, { exceptSessionId } = {}, tx) => {
  const { count } = await db(tx).session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId && { id: { not: exceptSessionId } }),
    },
    data: { revokedAt: now },
  });
  return count;
};

const deleteRevokedBefore = (before, tx) =>
  db(tx).session.deleteMany({ where: { revokedAt: { lt: before } } });

const deviceFootprint = async (userId, userAgent, tx) => {
  const normalizedUserAgent = userAgent ? userAgent.slice(0, 512) : null;
  const [total, matching] = await Promise.all([
    db(tx).session.count({ where: { userId } }),
    db(tx).session.count({
      where: { userId, userAgent: normalizedUserAgent },
    }),
  ]);
  return { total, matching };
};

module.exports = {
  create,
  findActiveById,
  touch,
  listActiveByUser,
  revokeOne,
  revokeAllForUser,
  deleteRevokedBefore,
  deviceFootprint,
};
