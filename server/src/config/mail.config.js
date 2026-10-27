"use strict";

const driver =
  process.env.MAIL_DRIVER ||
  (process.env.NODE_ENV === "production" ? "smtp" : "console");
const logoUrl = process.env.MAIL_LOGO_URL || null;

if (!["smtp", "console"].includes(driver)) {
  throw new Error(`MAIL_DRIVER inconnu : ${driver}`);
}
if (driver === "console" && process.env.NODE_ENV === "production") {
  throw new Error('Le driver mail "console" est interdit en production.');
}
if (logoUrl && (!logoUrl.startsWith("https://") || !/\.png(?:[?#]|$)/i.test(logoUrl))) {
  throw new Error("MAIL_LOGO_URL doit être une URL HTTPS vers une image PNG.");
}

module.exports = Object.freeze({
  driver,
  from: process.env.MAIL_FROM || "PROTEK <no-reply@protek.com>",
  smtp: Object.freeze({
    host: process.env.MAIL_HOST,
    port: Number.parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: process.env.MAIL_SECURE === "true",
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  }),
  brand: Object.freeze({
    name: "PROTEK",
    appUrl: process.env.APP_URL || "https://app.protek.com",
    supportEmail: process.env.SUPPORT_EMAIL || "",
    logoUrl,
    colors: Object.freeze({
      primary: "#0F172A",
      primaryText: "#FFFFFF",
      background: "#F4F5F7",
      card: "#FFFFFF",
      text: "#1F2933",
      muted: "#6B7280",
    }),
  }),
}); 
