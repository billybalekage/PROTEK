"use strict";

const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("./normative-error");

function assertVerified(dataset, name) {
  const metadata = dataset?.meta;
  if (process.env.NODE_ENV === "test") return dataset;
  if (
    !metadata?.standard ||
    !metadata?.table ||
    !metadata?.edition ||
    !metadata?.enteredBy ||
    !metadata?.verifiedBy ||
    typeof metadata.verifiedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(metadata.verifiedAt) ||
    metadata.verifiedBy === metadata.enteredBy ||
    metadata?.status !== "verified" ||
    Number.isNaN(Date.parse(metadata.verifiedAt))
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      `Table normative « ${name} » non vérifiée : calcul impossible.`,
      {
        reference: metadata?.standard || null,
        details: { table: name },
      },
    );
  }
  return dataset;
}

module.exports = { assertVerified };
