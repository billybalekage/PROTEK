const path = require('path');
const nodemailer = require('nodemailer');
const env = require('../../config/env'); // adapte le chemin à ton module de validation des variables d'environnement
const { emailTheme } = require('./email.theme');

const LOGO_PATH = path.join(__dirname, 'assets', 'proteck-mark.png');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: String(env.SMTP_SECURE) === 'true',
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

/**
 * Envoie un email à partir d'un template { subject, html, text }.
 * Le logo est joint en CID et référencé par le layout.
 */
async function sendEmail({ to, template }) {
  const { subject, html, text } = template;
  try {
    return await transporter.sendMail({
      from: `"${emailTheme.brandName}" <${env.MAIL_FROM}>`,
      to,
      subject,
      html,
      text,
      attachments: [
        { filename: 'proteck-mark.png', path: LOGO_PATH, cid: emailTheme.logoCid },
      ],
    });
  } catch (err) {
    // Ne jamais journaliser le contenu de l'email (liens de reset = données sensibles)
    console.error(`[email] Échec d'envoi (${subject}) :`, err.message);
    throw err;
  }
}

module.exports = { sendEmail };