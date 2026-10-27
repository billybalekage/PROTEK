"use strict";

const tokenService = require("./services/token.service");

module.exports = {
  authenticateAccessToken: tokenService.authenticateAccessToken,
};