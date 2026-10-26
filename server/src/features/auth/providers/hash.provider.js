const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const {password: pwdConfig} = require("../../../config/auth");

const DUMMY_HASH = bcrypt.hashSync('protek-dummy-password', pwdConfig.bcryptRounds);
const hashPassword = (plain) => bcrypt.hash(plain, pwdConfig.bcryptRounds);

const verifyPassword = async (plain, hash) => {
    const valid = await bcrypt.compare(plain, hash || DUMMY_HASH);
    return Boolean(hash) && valid
}

// Hash pour les jetons aleatoire(non reversible)
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

// Jeton opaque aleatoire (Refresh token, invitation)
const generateOpaqueToken =  (bytes = 48) => crypto.randomBytes(bytes).toString('base64url')

// Otp numerique avec length = 6
const generateOtp = (length = 6) => {
    const max = 10 ** length
    return String(crypto.randomInt(0, max)).padStart(length, '0')
}

// Comparaison des 2 hash
const safeEqual = (a, b) => {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}


module.exports = {
    hashPassword, 
    verifyPassword,
    sha256, 
    generateOpaqueToken,
    generateOtp,
    safeEqual
}