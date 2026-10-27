"use strict";

const { z } = require("zod");
const { getMembership } = require("../../features/organizations");
const {
  canInOrg,
  canInPersonalSpace,
  isKnownPermission,
} = require("../../features/organizations/policies/permissions");
const { ForbiddenError, TokenInvalidError } = require("../errors/auth.error");
const ValidationError = require("../errors/validator.error");
const { authenticate } = require("./authenticate");

const ORG_HEADER = "x-organization-id";
const organizationIdSchema = z.string().uuid();

const orgContext = async (req, _res, next) => {
  try {
    req.org = null;
    const rawOrganizationId = req.get(ORG_HEADER);
    if (!rawOrganizationId) return next();
    if (!req.auth) throw new TokenInvalidError("Authentification requise.");

    const parsed = organizationIdSchema.safeParse(rawOrganizationId.trim());
    if (!parsed.success) {
      throw new ValidationError([
        {
          field: "X-Organization-Id",
          message: "Identifiant d'organisation invalide.",
        },
      ]);
    }

    const membership = await getMembership(req.auth.userId, parsed.data);
    if (!membership) {
      throw new ForbiddenError(
        "Vous n'êtes pas membre de cette organisation.",
      );
    }

    req.org = { id: membership.organizationId, role: membership.role };
    return next();
  } catch (err) {
    return next(err);
  }
};

const authorize = (permission) => {
  if (!isKnownPermission(permission)) {
    throw new Error(`Permission inconnue : ${permission}`);
  }

  return (req, _res, next) => {
    if (!req.auth) {
      return next(new TokenInvalidError("Authentification requise."));
    }
    if (req.org === undefined) {
      return next(new Error("authorize() doit être précédé de orgContext()"));
    }

    if (req.org) {
      if (!canInOrg(req.org.role, permission)) {
        return next(
          new ForbiddenError(
            `Votre rôle (${req.org.role}) ne permet pas cette action.`,
          ),
        );
      }
    } else if (!canInPersonalSpace(permission)) {
      return next(
        new ForbiddenError(
          "Cette action nécessite de travailler dans une organisation.",
        ),
      );
    }
    return next();
  };
};

const requirePermission = (permission) => [
  authenticate,
  orgContext,
  authorize(permission),
];

module.exports = { orgContext, authorize, requirePermission };
