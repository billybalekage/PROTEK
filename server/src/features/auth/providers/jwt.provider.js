const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../../../config/auth.config");
const { TokenInvalidError } = require("../../../shared/errors/auth.error");

/**
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.email
 * @param {string} params.sessionId
 * @param {string} [params.orgId] Organisation active(OPtionel)
 * @param {{token: string, jti: string, expiresAt: Date}}
 */

const signAccessToken = ({ userId, email, sessionId, orgId }, now = new Date()) => {
    const jti = crypto.randomUUID();
    const token = jwt.sign({email, sid: sessionId, ...(orgId && {orgId})}, jwtConfig.accessSecret, {
        algorithm: 'HS256',
        subject: userId,
        jwtid: jti,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        expiresIn: jwtConfig.accessTtlSeconds
    })

    return {
        token, jti, expiresAt: new Date(now.getTime() + jwtConfig.accessTtlSeconds * 1000)
    }
}

/**
 * @throws {TokenInvalidError}
 */

const verifyAccessToken = (token) => {
    try {
        const payload = jwt.verify(token, jwtConfig.accessSecret, {
            algorithms: ['HS256'],
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        })

        if (
            typeof payload.sub !== "string" ||
            typeof payload.email !== "string" ||
            typeof payload.sid !== "string" ||
            typeof payload.jti !== "string" ||
            typeof payload.exp !== "number"
        ) {
            throw new TokenInvalidError();
        }
        return {
            userId: payload.sub,
            email: payload.email,
            sessionId: payload.sid,
            orgId: payload.orgId || null,
            jti: payload.jti,
            expiresAt: new Date(payload.exp * 1000),
        }
    } catch (err) {
        throw new TokenInvalidError()
    }
}

module.exports = {
    signAccessToken, verifyAccessToken
}