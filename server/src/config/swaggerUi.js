"use strict";

const express = require("express");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const spec = require("./swagger");

const router = express.Router();

router.use(helmet({ contentSecurityPolicy: false }));

router.get("/", (req, res) => res.redirect(302, `${req.baseUrl}/docs`));

router.get("/docs.json", (req, res) => res.json(spec));

router.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: "PROTECK API - Documentation",
    swaggerOptions: {
      persistAuthorization: true, // conserve le jeton JWT entre rechargements
      displayRequestDuration: true,
      docExpansion: "none",
    },
  }),
);

module.exports = router;
