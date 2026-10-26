const toInt = (value, fallback) => {
    const n = parseInt(value, 10)
    return Number.isNaN(n) ? fallback : n
}

const MINUTE = 60*1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

module.exports = Object.freeze({
    jwt : {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        issuer: process.env.JWT_ISSUER || 'protek_apis',
        audience: process.env.JWT_AUDIENCE || 'protek_clients',
        accessTtlSeconds : toInt(process.env.JWT_TTL_SECONDS, 15 * 60)
    },

    refreshToken : {
        ttlMs: toInt(process.env.REFRESH_TTL_DAY, 30) * DAY,
        bytes: 48
    },

    password: {
        bcryptRounds: toInt(process.env.BCRYPTROUNDS, 12),
        minLength: 10,
        maxLength: 72
    },

    otp: {
        length: 6,
        ttlMs: 10 * MINUTE,
        maxAttemps: 5,
        resendCooldownMs: 60 * 1000
    },

    invitation: {
        ttlMs: 48 * HOUR,
        bytes: 32
    },

    lockout: {
        captchAfterFailures: 3,
        captchaWindowMs: 30 * 1000,
        criticalFailures: 5,
        levelsMs: [15 * MINUTE, 1 * HOUR, 24 * HOUR],
        resetFailuresAfterMs: 30 * MINUTE,
    }
})