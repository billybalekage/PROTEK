"use strict";

const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");
const env = require("./env");

const srcDir = path.join(__dirname, "..");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "PROTECK API",
      version: "1.0.0",
      description:
        "API de dimensionnement et de vérification de conformité des installations électriques (NF C 15-100 / CEI 60364). " +
        "PROTECK est une aide à la conception : la validation finale et la signature du dossier incombent à l'ingénieur ou l'électricien qualifié.",
    },
    servers: [{ url: env.apiPublicUrl, description: `Serveur ${env.nodeEnv}` }],
    tags: [
      { name: "Santé", description: "Supervision du service" },
      { name: "Auth", description: "Authentification et sessions" },
      { name: "Projets", description: "Projets et versions d'installation" },
      {
        name: "Circuits",
        description: "Circuits, dimensionnement et protections",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VOLTAGE_DROP_EXCEEDED" },
                message: {
                  type: "string",
                  example:
                    "Chute de tension supérieure à 3 % pour un circuit éclairage (NF C 15-100).",
                },
                details: { type: "object", nullable: true },
                requestId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Requête invalide (validation des données)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Unauthorized: {
          description: "Authentification requise ou jeton invalide",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "Accès refusé (ressource d'une autre organisation)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Ressource introuvable",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Unprocessable: {
          description: "Non-conformité normative ou règle métier non respectée",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        TooManyRequests: {
          description: "Limite de requêtes dépassée",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  // Fichiers contenant les annotations @openapi
  apis: [
    path.join(srcDir, "docs", "*.docs.js"),
    path.join(srcDir, "features", "**", "*.routes.js"),
    path.join(srcDir, "features", "**", "*.docs.js"),
  ],
};

module.exports = swaggerJsdoc(options);
