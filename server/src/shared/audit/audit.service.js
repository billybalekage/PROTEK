"use strict";

const auditRepository = require("./audit.repository");
const logger = require("../../config/logger");

const record = async (entry) => {
  try {
    await auditRepository.record(entry);
  } catch (err) {
    logger.error(
      {
        action: entry.action,
        err: { name: err.name, code: err.code },
      },
      "Échec d'écriture du journal d'audit",
    );
  }
};

module.exports = { record };
