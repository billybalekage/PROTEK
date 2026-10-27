"use strict";

const express = require("express");
const authenticate = require("../middlewares/authenticate");
const requireTenantContext = require("../middlewares/requireTenantContext");

const apiRouter = express.Router();
const protectedRouter = express.Router()

apiRouter.use("/auth", require("../features/auth/routes/auth.routes"));

protectedRouter.use(authenticate, requireTenantContext)

apiRouter.use(protectedRouter)

module.exports = apiRouter;
