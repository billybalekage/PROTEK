"use strict";

const {
  createLimiter,
  keyByIp,
  keyByIpAndEmail,
  keyByUser,
} = require("../../../shared/middleware/rateLimiter");
const { rateLimit } = require("../../../config/auth.config");

module.exports = {
  signup: createLimiter({ ...rateLimit.signup, keyGenerator: keyByIp }),
  loginPerAccount: createLimiter({
    ...rateLimit.login,
    keyGenerator: keyByIpAndEmail,
  }),
  loginPerIp: createLimiter({
    ...rateLimit.loginIp,
    keyGenerator: keyByIp,
  }),
  otpSend: createLimiter({
    ...rateLimit.otpSend,
    keyGenerator: keyByIpAndEmail,
  }),
  otpAttempt: createLimiter({
    ...rateLimit.otpAttempt,
    keyGenerator: keyByIpAndEmail,
  }),
  refresh: createLimiter({ ...rateLimit.refresh, keyGenerator: keyByIp }),
  authed: createLimiter({ ...rateLimit.authed, keyGenerator: keyByUser }),
};
