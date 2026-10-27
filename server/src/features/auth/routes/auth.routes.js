"use strict";

const router = require("express").Router();
const validate = require("../../../shared/middleware/validate");
const {
  authenticate,
  optionalAuthenticate,
} = require("../../../shared/middleware/authenticate");
const validators = require("../validators/auth.validators");
const limiters = require("./auth.limiters");
const auth = require("../controllers/auth.controller");
const account = require("../controllers/account.controller");
const sessions = require("../controllers/session.controller");

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post(
  "/signup",
  limiters.signup,
  validate(validators.signup),
  auth.signup,
);
router.post(
  "/verify-email",
  limiters.otpAttempt,
  validate(validators.verifyEmail),
  auth.verifyEmail,
);
router.post(
  "/resend-code",
  limiters.otpSend,
  validate(validators.resendOtp),
  auth.resendCode,
);
router.post(
  "/login",
  limiters.loginPerIp,
  limiters.loginPerAccount,
  validate(validators.login),
  auth.login,
);
router.post(
  "/refresh",
  limiters.refresh,
  validate(validators.refresh),
  auth.refresh,
);
router.post(
  "/logout",
  limiters.refresh,
  optionalAuthenticate,
  validate(validators.logout),
  auth.logout,
);
router.post(
  "/forgot-password",
  limiters.otpSend,
  validate(validators.forgotPassword),
  auth.forgotPassword,
);
router.post(
  "/reset-password",
  limiters.otpAttempt,
  validate(validators.resetPassword),
  auth.resetPassword,
);

router.get("/me", authenticate, limiters.authed, account.me);
router.post(
  "/change-password",
  authenticate,
  limiters.authed,
  validate(validators.changePassword),
  account.changePassword,
);
router.post(
  "/email-change",
  authenticate,
  limiters.authed,
  validate(validators.requestEmailChange),
  account.requestEmailChange,
);
router.post(
  "/email-change/confirm",
  authenticate,
  limiters.authed,
  validate(validators.confirmEmailChange),
  account.confirmEmailChange,
);
router.get("/sessions", authenticate, limiters.authed, sessions.list);
router.post(
  "/sessions/revoke-others",
  authenticate,
  limiters.authed,
  sessions.revokeOthers,
);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  limiters.authed,
  validate(validators.sessionIdParam),
  sessions.revoke,
);

module.exports = router;