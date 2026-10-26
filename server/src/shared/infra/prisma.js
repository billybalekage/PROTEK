"use strict";

const { prisma } = require("../../config/db");

const runInTransaction = (fn, options = {}) =>
  prisma.$transaction(fn, { maxWait: 5000, timeout: 10000, ...options });

module.exports = { prisma, runInTransaction };
