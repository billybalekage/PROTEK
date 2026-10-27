"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const accountService = require("../services/account.service");
const { requestContext } = require("./transport");

const me = asyncHandler(async (req, res) => {
  const user = await accountService.getMe(req.auth.userId);
  res.json({ data: { user, sessionId: req.auth.sessionId } });
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await accountService.changePassword(
    {
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      ...req.body,
    },
    requestContext(req),
  );
  res.json({ data });
});

const requestEmailChange = asyncHandler(async (req, res) => {
  const data = await accountService.requestEmailChange(
    { userId: req.auth.userId, ...req.body },
    requestContext(req),
  );
  res.json({ data });
});

const confirmEmailChange = asyncHandler(async (req, res) => {
  const data = await accountService.confirmEmailChange(
    {
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      ...req.body,
    },
    requestContext(req),
  );
  res.json({ data });
});

module.exports = { me, changePassword, requestEmailChange, confirmEmailChange };
