"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/errors/AppError");
const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const transport = require("./transport");

const signup = asyncHandler(async (req, res) => {
  const data = await authService.signup(
    req.body,
    transport.requestContext(req),
  );
  res.status(202).json({ data });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const data = await authService.verifyEmail(
    req.body,
    transport.requestContext(req),
  );
  res.json({ data });
});

const resendCode = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;
  const data =
    purpose === "PASSWORD_RESET"
      ? await authService.forgotPassword(
          { email },
          transport.requestContext(req),
        )
      : await authService.resendVerification({ email });
  res.json({ data });
});

const login = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.login(
    req.body,
    transport.requestContext(req),
  );
  transport.sendTokens(req, res, { user, tokens });
});

const refresh = asyncHandler(async (req, res) => {
  let tokens;
  try {
    tokens = await tokenService.rotateRefreshToken(
      transport.readRefreshToken(req),
      { ipAddress: req.ip },
    );
  } catch (err) {
    if (
      transport.usesCookie(req) &&
      err instanceof AppError &&
      err.statusCode === 401
    ) {
      transport.clearRefreshCookie(res);
    }
    throw err;
  }
  transport.sendTokens(req, res, { tokens });
});

const logout = asyncHandler(async (req, res) => {
  await tokenService.logout({
    refreshToken: transport.readRefreshToken(req),
    access: req.auth || undefined,
  });
  if (transport.usesCookie(req)) transport.clearRefreshCookie(res);
  res.status(204).end();
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(
    req.body,
    transport.requestContext(req),
  );
  res.json({ data });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(
    req.body,
    transport.requestContext(req),
  );
  res.json({ data });
});

module.exports = {
  signup,
  verifyEmail,
  resendCode,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
