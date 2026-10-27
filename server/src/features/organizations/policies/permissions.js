"use strict";

const ORG_ADMIN = "ORG_ADMIN";
const ING_ELECTRICIAN = "ING_ELECTRICIAN";
const TECHNICIAN = "TECHNICIAN";
const READER = "READER";

const ALL_ROLES = [ORG_ADMIN, ING_ELECTRICIAN, TECHNICIAN, READER];
const WRITERS = [ORG_ADMIN, ING_ELECTRICIAN, TECHNICIAN];

const PERMISSIONS = Object.freeze({
  "org:manage": { roles: [ORG_ADMIN], orgOnly: true },
  "project:read": { roles: ALL_ROLES },
  "project:write": { roles: WRITERS },
  "circuit:write": { roles: WRITERS },
  "calculation:run": { roles: [ORG_ADMIN, ING_ELECTRICIAN] },
  "report:generate": { roles: [ORG_ADMIN, ING_ELECTRICIAN, READER] },
});

const isKnownPermission = (permission) =>
  Object.prototype.hasOwnProperty.call(PERMISSIONS, permission);

const canInOrg = (role, permission) =>
  isKnownPermission(permission) && PERMISSIONS[permission].roles.includes(role);

const canInPersonalSpace = (permission) =>
  isKnownPermission(permission) && !PERMISSIONS[permission].orgOnly;

module.exports = {
  PERMISSIONS,
  isKnownPermission,
  canInOrg,
  canInPersonalSpace,
};
