"use strict";

const express = require("express");
const authenticate = require("../middlewares/authenticate");
const requireTenantContext = require("../middlewares/requireTenantContext");

const apiRouter = express.Router();

apiRouter.use(authenticate, requireTenantContext);

module.exports = apiRouter;
