"use strict";

const crypto = require("crypto");
const { runInTransaction } = require("../../../shared/infra/prisma");
const { refreshToken: refreshConfig } = require("../../../config/auth.config");
const {
  TokenInvalidError,
  TokenReuseDetectedError,
} = require("../../../shared/errors/auth.error");
const auditService = require("../../../shared/audit/audit.service");
const userRepository = require("../repositories/user.repository");
const sessionRepository = require("../repositories/session.repository");
const refreshRepository = require("../repositories/refreshToken.repository");
const tokenBlacklist = require("../providers/tokenBlacklist");
const {
  sha256,
  generateOpaqueToken,
} = require("../providers/hash.provider");
const {
  signAccessToken,
  verifyAccessToken,
} = require("../providers/jwt.provider");

const withTx = (tx, callback) =>
  tx ? callback(tx) : runInTransaction(callback);

const issueTokenPair = async ({ user, sessionId, familyId, now }, tx) => {
  const refreshToken = generateOpaqueToken(refreshConfig.bytes);
  const refreshTokenExpiresAt = new Date(now.getTime() + refreshConfig.ttlMs);

  await refreshRepository.create(
    {
      userId: user.id,
      sessionId,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    },
    tx,
  );

  const access = signAccessToken(
    { userId: user.id, email: user.email, sessionId },
    now,
  );

  return {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    sessionId,
  };
};

const startSession = ({ user, device = {}, now = new Date() }, tx) =>
  withTx(tx, async (client) => {
    const session = await sessionRepository.create(
      { userId: user.id, ...device },
      client,
    );
    return issueTokenPair(
      {
        user,
        sessionId: session.id,
        familyId: crypto.randomUUID(),
        now,
      },
      client,
    );
  });

const reissueFrom = async (token, now, tx) => {
  const [session, user] = await Promise.all([
    sessionRepository.findActiveById(token.sessionId, tx),
    userRepository.findById(token.userId, tx),
  ]);

  if (!session || !user || user.status !== "ACTIVE") {
    return { status: "INVALID" };
  }

  await sessionRepository.touch(token.sessionId, now, tx);
  const tokens = await issueTokenPair(
    { user, sessionId: token.sessionId, familyId: token.familyId, now },
    tx,
  );
  return { status: "OK", tokens };
};

const revokeAllSessions = (userId, { exceptSessionId, now = new Date() } = {}, tx) =>
  withTx(tx, async (client) => {
    const count = await sessionRepository.revokeAllForUser(
      userId,
      now,
      { exceptSessionId },
      client,
    );
    await refreshRepository.revokeAllForUser(
      userId,
      now,
      { exceptSessionId },
      client,
    );
    return count;
  });

const rotateRefreshToken = async (
  presented,
  { now = new Date(), ipAddress } = {},
) => {
  if (typeof presented !== "string" || presented.length === 0) {
    throw new TokenInvalidError();
  }
  const tokenHash = sha256(presented);

  const outcome = await runInTransaction(async (tx) => {
    const consumed = await refreshRepository.consumeActive(tokenHash, now, tx);
    if (consumed) return reissueFrom(consumed, now, tx);

    const known = await refreshRepository.findByHash(tokenHash, tx);
    if (!known || !known.usedAt) return { status: "INVALID" };

    const reuseAgeMs = now.getTime() - known.usedAt.getTime();
    const withinGrace =
      reuseAgeMs >= 0 &&
      reuseAgeMs <= refreshConfig.reuseGraceMs &&
      known.expiresAt > now;

    if (withinGrace) {
      await refreshRepository.revokeFamily(known.familyId, now, tx);
      return reissueFrom(known, now, tx);
    }

    const sessionWasActive = await sessionRepository.revokeOne(
      known.sessionId,
      known.userId,
      now,
      tx,
    );
    await refreshRepository.revokeFamily(known.familyId, now, tx);
    if (refreshConfig.revokeAllSessionsOnReuse) {
      await revokeAllSessions(known.userId, { now }, tx);
    }
    return { status: "REUSE", known, sessionWasActive };
  });

  if (outcome.status === "OK") return outcome.tokens;
  if (outcome.status === "REUSE") {
    if (outcome.sessionWasActive) {
      await auditService.record({
        action: "REFRESH_REUSE_DETECTED",
        userId: outcome.known.userId,
        ipAddress,
        details: {
          sessionId: outcome.known.sessionId,
          familyId: outcome.known.familyId,
        },
      });
    }
    throw new TokenReuseDetectedError();
  }

  throw new TokenInvalidError();
};

const revokeSession = (sessionId, userId, { now = new Date() } = {}, tx) =>
  withTx(tx, async (client) => {
    const revoked = await sessionRepository.revokeOne(
      sessionId,
      userId,
      now,
      client,
    );
    if (revoked) {
      await refreshRepository.revokeBySession(sessionId, now, client);
    }
    return revoked;
  });

const logout = async ({ refreshToken, access } = {}, { now = new Date() } = {}) => {
  let sessionId = access && access.sessionId;
  let userId = access && access.userId;

  if (!sessionId && refreshToken) {
    const known = await refreshRepository.findByHash(sha256(refreshToken));
    if (known) ({ sessionId, userId } = known);
  }

  if (sessionId && userId) {
    await revokeSession(sessionId, userId, { now });
  }
  if (access && access.jti) {
    await tokenBlacklist.revoke(access.jti, access.expiresAt);
  }
};

const authenticateAccessToken = async (token) => {
  const payload = verifyAccessToken(token);
  const [revoked, session] = await Promise.all([
    tokenBlacklist.isRevoked(payload.jti),
    sessionRepository.findActiveById(payload.sessionId),
  ]);

  if (
    revoked ||
    !session ||
    session.userId !== payload.userId ||
    session.user.status !== "ACTIVE"
  ) {
    throw new TokenInvalidError();
  }
  return payload;
};

module.exports = {
  startSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessions,
  logout,
  authenticateAccessToken,
};
