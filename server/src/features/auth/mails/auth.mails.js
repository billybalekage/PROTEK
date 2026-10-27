"use strict";

const { brand } = require("../../../config/mail.config");
const { otp } = require("../../../config/auth.config");
const {
  renderLayout,
  renderCode,
  renderButton,
  escapeHtml,
} = require("../../../shared/infra/mailer/layout");

const ttlMinutes = Math.round(otp.ttlMs / 60000);
const ignoreNote =
  "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.";
const greeting = (fullName) => {
  const first = String(fullName || "")
    .trim()
    .split(/\s+/)[0];
  return first ? `Bonjour ${first},` : "Bonjour,";
};
const paragraph = (html) =>
  `<p style="margin:0 0 16px;line-height:1.55;">${html}</p>`;

const emailVerification = ({ fullName, code }) => ({
  subject: `Votre code de vérification ${brand.name}`,
  html: renderLayout({
    preheader: "Confirmez votre adresse e-mail",
    bodyHtml:
      paragraph(escapeHtml(greeting(fullName))) +
      paragraph(
        `Voici votre code pour confirmer votre adresse e-mail. Il est valable ${ttlMinutes} minutes.`,
      ) +
      renderCode(code) +
      paragraph(ignoreNote),
  }),
  text: `${greeting(fullName)}\n\nVotre code de vérification : ${code}\nValable ${ttlMinutes} minutes.\n\n${ignoreNote}`,
});

const passwordReset = ({ fullName, code }) => ({
  subject: `Réinitialisation de votre mot de passe ${brand.name}`,
  html: renderLayout({
    preheader: "Code de réinitialisation du mot de passe",
    bodyHtml:
      paragraph(escapeHtml(greeting(fullName))) +
      paragraph(
        `Utilisez ce code pour choisir un nouveau mot de passe. Il est valable ${ttlMinutes} minutes.`,
      ) +
      renderCode(code) +
      paragraph(`${ignoreNote} Votre mot de passe actuel reste inchangé.`),
  }),
  text: `${greeting(fullName)}\n\nCode de réinitialisation : ${code}\nValable ${ttlMinutes} minutes.\n\n${ignoreNote} Votre mot de passe actuel reste inchangé.`,
});

const accountAlreadyExists = ({ fullName }) => ({
  subject: `Vous avez déjà un compte ${brand.name}`,
  html: renderLayout({
    preheader: "Une inscription a été tentée avec votre adresse",
    bodyHtml:
      paragraph(escapeHtml(greeting(fullName))) +
      paragraph(
        "Une inscription a été tentée avec cette adresse e-mail, mais un compte existe déjà.",
      ) +
      renderButton("Se connecter", `${brand.appUrl}/login`) +
      paragraph(
        `Mot de passe oublié ? Utilisez « Mot de passe oublié » sur la page de connexion. ${ignoreNote}`,
      ),
  }),
  text: `${greeting(fullName)}\n\nUne inscription a été tentée avec votre adresse, mais un compte existe déjà.\nConnexion : ${brand.appUrl}/login\n\n${ignoreNote}`,
});

const passwordChanged = ({ fullName }) => ({
  subject: `Votre mot de passe ${brand.name} a été modifié`,
  html: renderLayout({
    preheader: "Mot de passe modifié",
    bodyHtml:
      paragraph(escapeHtml(greeting(fullName))) +
      paragraph(
        "Votre mot de passe vient d'être modifié et vos autres appareils ont été déconnectés.",
      ) +
      paragraph(
        `Si ce n'est pas vous, réinitialisez-le immédiatement et contactez ${escapeHtml(brand.supportEmail)}.`,
      ),
  }),
  text: `${greeting(fullName)}\n\nVotre mot de passe vient d'être modifié et vos appareils ont été déconnectés.\nSi ce n'est pas vous, réinitialisez-le immédiatement et contactez ${brand.supportEmail}.`,
});

const newDeviceLogin = ({ fullName, userAgent, ipAddress, at }) => {
  const when = at.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const device = userAgent ? userAgent.slice(0, 120) : "appareil inconnu";
  return {
    subject: `Nouvelle connexion à votre compte ${brand.name}`,
    html: renderLayout({
      preheader: "Connexion depuis un nouvel appareil",
      bodyHtml:
        paragraph(escapeHtml(greeting(fullName))) +
        paragraph(
          "Une connexion à votre compte a été détectée depuis un nouvel appareil :",
        ) +
        paragraph(
          `<strong>Appareil :</strong> ${escapeHtml(device)}<br><strong>Adresse IP :</strong> ${escapeHtml(ipAddress || "inconnue")}<br><strong>Date :</strong> ${escapeHtml(when)}`,
        ) +
        paragraph(
          "Si c'était vous, aucune action n'est nécessaire. Sinon, changez votre mot de passe et déconnectez les autres appareils.",
        ),
    }),
    text: `${greeting(fullName)}\n\nNouvelle connexion détectée.\nAppareil : ${device}\nIP : ${ipAddress || "inconnue"}\nDate : ${when}\n\nSi ce n'est pas vous, changez votre mot de passe et déconnectez les autres appareils.`,
  };
};

const emailChangeCode = ({ fullName, code }) => ({
  subject: `Confirmez votre nouvelle adresse e-mail ${brand.name}`,
  html: renderLayout({
    preheader: "Code de confirmation de votre nouvelle adresse",
    bodyHtml:
      paragraph(escapeHtml(greeting(fullName))) +
      paragraph(
        `Saisissez ce code pour confirmer cette adresse comme nouvelle adresse de votre compte. Il est valable ${ttlMinutes} minutes.`,
      ) +
      renderCode(code) +
      paragraph(ignoreNote),
  }),
  text: `${greeting(fullName)}\n\nCode de confirmation de votre nouvelle adresse : ${code}\nValable ${ttlMinutes} minutes.\n\n${ignoreNote}`,
});

const emailChanged = ({ fullName, newEmail }) => ({
  subject: `L'adresse e-mail de votre compte ${brand.name} a changé`,
  html: renderLayout({
    preheader: "Adresse e-mail modifiée",
    bodyHtml:
      paragraph(escapeHtml(greeting(fullName))) +
      paragraph(
        `L'adresse e-mail de votre compte est désormais <strong>${escapeHtml(newEmail)}</strong>. Vous ne recevrez plus de messages à cette adresse.`,
      ) +
      paragraph(
        `Si ce n'est pas vous, contactez immédiatement ${escapeHtml(brand.supportEmail)}.`,
      ),
  }),
  text: `${greeting(fullName)}\n\nL'adresse e-mail de votre compte est désormais ${newEmail}.\nSi ce n'est pas vous, contactez ${brand.supportEmail}.`,
});

module.exports = {
  emailVerification,
  passwordReset,
  accountAlreadyExists,
  passwordChanged,
  newDeviceLogin,
  emailChangeCode,
  emailChanged,
};
