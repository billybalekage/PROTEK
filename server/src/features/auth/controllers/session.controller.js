"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const accountService = require("../services/account.service");
const transport = require("./transport");

const list = asyncHandler(async (req, res) => {
  const sessions = await accountService.listSessions(
    req.auth.userId,
    req.auth.sessionId,
  );
  res.json({ data: { sessions } });
});

const revoke = asyncHandler(async (req, res) => {
  const { revokedCurrent } = await accountService.revokeSession(
    {
      userId: req.auth.userId,
      sessionId: req.validated.params.sessionId,
      currentSessionId: req.auth.sessionId,
    },
    transport.requestContext(req),
  );
  if (revokedCurrent && transport.usesCookie(req)) {
    transport.clearRefreshCookie(res);
  }
  res.status(204).end();
});

const revokeOthers = asyncHandler(async (req, res) => {
  const data = await accountService.revokeOtherSessions(
    { userId: req.auth.userId, currentSessionId: req.auth.sessionId },
    transport.requestContext(req),
  );
  res.json({ data });
});

module.exports = { list, revoke, revokeOthers };
