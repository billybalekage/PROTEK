"use strict";

const { prisma } = require("../../../shared/infra/prisma");

const db = (tx) => tx || prisma;

const findByUserAndOrg = (userId, organizationId, tx) =>
  db(tx).userOrganization.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { organizationId: true, role: true },
  });

module.exports = { findByUserAndOrg };
