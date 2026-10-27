"use strict";

const { captcha: config } = require("../../../config/auth.config");
const logger = require("../../../config/logger");

if (!["none", "turnstile"].includes(config.driver)) {
  throw new Error(`CAPTCHA_DRIVER inconnu : ${config.driver}`);
}
if (process.env.NODE_ENV === "production" && config.driver === "none") {
  throw new Error('CAPTCHA_DRIVER=none est interdit en production.');
}
if (config.driver === "turnstile" && !config.secret) {
  throw new Error("CAPTCHA_SECRET est requis avec CAPTCHA_DRIVER=turnstile.");
}

const verify = async (token, ipAddress) => {
  if (config.driver === "none") return true;
  if (!token) return false;

  try {
    const body = new globalThis.URLSearchParams({
      secret: config.secret,
      response: token,
    });
    if (ipAddress) body.set("remoteip", ipAddress);

    const response = await globalThis.fetch(config.verifyUrl, {
      method: "POST",
      body,
      signal: globalThis.AbortSignal.timeout(config.timeoutMs),
    });
    if (!response.ok) {
      logger.warn(
        { statusCode: response.status },
        "Échec de la vérification Turnstile",
      );
      return false;
    }
    const result = await response.json();
    return result.success === true;
  } catch (err) {
    logger.error(
      { err: { name: err.name, code: err.code } },
      "Échec de la vérification Turnstile",
    );
    return false;
  }
};

module.exports = { verify };
