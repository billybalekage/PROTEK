"use strict";

const AppError = require("./AppError");

const ERROR_CODES = Object.freeze({
  INTERNAL_ERROR: Object.freeze({
    statusCode: 500,
    message: "Erreur interne du serveur.",
    category: "operational",
  }),
  INVALID_INPUT: Object.freeze({
    statusCode: 400,
    message: "Les données fournies sont invalides.",
    category: "operational",
  }),
  INVALID_JSON: Object.freeze({
    statusCode: 400,
    message: "Corps de requête JSON invalide.",
    category: "operational",
  }),
  PAYLOAD_TOO_LARGE: Object.freeze({
    statusCode: 413,
    message: "Corps de requête trop volumineux.",
    category: "operational",
  }),
  UNAUTHORIZED: Object.freeze({
    statusCode: 401,
    message: "Authentification requise.",
    category: "operational",
  }),
  FORBIDDEN: Object.freeze({
    statusCode: 403,
    message: "Accès refusé.",
    category: "operational",
  }),
  TENANT_CONTEXT_REQUIRED: Object.freeze({
    statusCode: 403,
    message:
      "Aucun contexte d’organisation valide n’est associé à l’utilisateur.",
    category: "operational",
  }),
  ROUTE_NOT_FOUND: Object.freeze({
    statusCode: 404,
    message: "Route introuvable.",
    category: "operational",
  }),
  CORS_NOT_ALLOWED: Object.freeze({
    statusCode: 403,
    message: "Origine non autorisée par CORS.",
    category: "operational",
  }),
  TOO_MANY_REQUESTS: Object.freeze({
    statusCode: 429,
    message: "Trop de requêtes, réessayez plus tard.",
    category: "operational",
  }),
  VOLTAGE_DROP_EXCEEDED: Object.freeze({
    statusCode: 422,
    message: "La chute de tension dépasse la limite autorisée.",
    category: "normative",
  }),
  EXCEEDING_CABLE_CAPACITY: Object.freeze({
    statusCode: 422,
    message:
      "Le courant admissible du câble est insuffisant pour la protection sélectionnée.",
    category: "normative",
  }),
  DISCRIMINATION_FAILURE: Object.freeze({
    statusCode: 422,
    message:
      "La sélectivité entre les dispositifs de protection n’est pas démontrée.",
    category: "normative",
  }),
  SHORT_CIRCUIT_PDC_INADEQUATE: Object.freeze({
    statusCode: 422,
    message:
      "Le pouvoir de coupure du dispositif est insuffisant au courant de court-circuit présumé.",
    category: "normative",
  }),
  THERMAL_COORDINATION_FAILURE: Object.freeze({
    statusCode: 422,
    message:
      "La coordination thermique entre le conducteur et sa protection n’est pas respectée.",
    category: "normative",
  }),
  GROUND_RESISTANCE_EXCEEDED: Object.freeze({
    statusCode: 422,
    message: "La résistance de terre dépasse la limite de sécurité applicable.",
    category: "normative",
  }),
});

class OperationalError extends AppError {
  constructor(code, details = null) {
    const definition = ERROR_CODES[code];
    if (!definition || definition.category !== "operational") {
      throw new TypeError(`Code d’erreur opérationnelle inconnu : ${code}`);
    }

    super(definition.message, definition.statusCode, code, details);
    this.name = "OperationalError";
  }
}

class NormativeError extends AppError {
  constructor(code, details = null) {
    const definition = ERROR_CODES[code];
    if (!definition || definition.category !== "normative") {
      throw new TypeError(`Code d’erreur normative inconnu : ${code}`);
    }

    super(definition.message, definition.statusCode, code, details);
    this.name = "NormativeError";
  }
}

module.exports = { ERROR_CODES, NormativeError, OperationalError };


// Connexion avec core/electric-rules/shared qui connecte residentiel avec les messages d'erreur et les reference normative nationnal et internationnales. 