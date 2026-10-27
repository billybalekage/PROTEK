"use strict";

const { brand } = require("../../../config/mail.config");

const { colors } = brand;
const FONT = "Arial, Helvetica, sans-serif";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const renderHeader = () =>
  brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" height="36" style="display:block;border:0;height:36px;">`
    : `<span style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:0.32em;color:${colors.primary};">${escapeHtml(brand.name)}</span>`;

const renderCode = (code) =>
  `<div style="margin:8px 0 20px;padding:16px;text-align:center;background:${colors.primary};color:${colors.primaryText};font-family:'Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:0.4em;border-radius:6px;">${escapeHtml(code)}</div>`;

const renderButton = (label, url) =>
  `<p style="margin:0 0 20px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;background:${colors.primary};color:${colors.primaryText};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a></p>`;

const renderLayout = ({ preheader = "", bodyHtml }) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${colors.background};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.background};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="padding:0 4px 16px;">${renderHeader()}</td></tr>
    <tr><td style="background:${colors.card};padding:28px 24px;border-radius:8px;font-family:${FONT};font-size:15px;color:${colors.text};">${bodyHtml}</td></tr>
    <tr><td style="padding:16px 4px;font-family:${FONT};font-size:12px;line-height:1.5;color:${colors.muted};">
      Cet e-mail est automatique, merci de ne pas y répondre. Besoin d'aide ? ${escapeHtml(brand.supportEmail)}
    </td></tr>
  </table>
</td></tr></table></body></html>`;

module.exports = { renderLayout, renderCode, renderButton, escapeHtml };
