"use strict";

const { assertVerified } = require("../shared/data-loader");
const {
  NormativeError,
  NORMATIVE_ERROR_CODES,
} = require("../shared/normative-error");
const catalog = require("./data/filiation-catalog.json");

function findVerifiedFiliation({ upstream, downstream, iccMaxKA }) {
  const verifiedCatalog = assertVerified(catalog, "catalogue de filiation");
  if (
    typeof upstream !== "string" ||
    !upstream.trim() ||
    typeof downstream !== "string" ||
    !downstream.trim() ||
    typeof iccMaxKA !== "number" ||
    !Number.isFinite(iccMaxKA) ||
    iccMaxKA <= 0
  ) {
    throw new NormativeError(
      NORMATIVE_ERROR_CODES.INVALID_INPUT,
      "Les références amont/aval et Icc maximal sont obligatoires pour rechercher une filiation.",
      { details: { upstream, downstream, iccMaxKA } },
    );
  }

  const entry = verifiedCatalog.entries.find(
    (candidate) =>
      candidate.upstream === upstream &&
      candidate.downstream === downstream &&
      candidate.verified === true &&
      typeof candidate.source === "string" &&
      candidate.source.trim() &&
      typeof candidate.iccMaxKA === "number" &&
      candidate.iccMaxKA >= iccMaxKA,
  );
  return entry || null;
}

module.exports = { findVerifiedFiliation };
