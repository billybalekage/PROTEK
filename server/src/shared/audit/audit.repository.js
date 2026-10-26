"use strict";

const { prisma } = require("../infra/prisma");

const db = (tx) => tx || prisma;

const record = ({ action, userId, projectId, ipAddress, details }, tx) =>
  db(tx).auditLog.create({
    data: {
      action,
      userId: userId || null,
      projectId: projectId || null,
      ipAddress: ipAddress || null,
      details: details || undefined,
    },
    select: { id: true },
  });

module.exports = { record };
