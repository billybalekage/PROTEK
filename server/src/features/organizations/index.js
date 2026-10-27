"use strict";

const membershipRepository = require("./repositories/membership.repository");

module.exports = {
  getMembership: (userId, organizationId) =>
    membershipRepository.findByUserAndOrg(userId, organizationId),
};