const { renderLayout } = require('../email.layout');
const { title, paragraph, button, muted } = require('../email.components');

function verifyEmailTemplate({ firstName, verifyUrl, expiresInHours, appUrl }) {
  const subject = 'Confirmez votre adresse email';
  const html = renderLayout({
    appUrl,
    preheader: 'Confirmez votre adresse pour activer votre compte PROTECK.',
    contentHtml: [
      title('Confirmez votre email'),
      paragraph(`Bonjour ${firstName}, cliquez sur le bouton ci-dessous pour activer votre compte.`),
      button({ label: 'Confirmer mon email', url: verifyUrl }),
      muted(`Ce lien expire dans ${expiresInHours} h. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`),
    ].join(''),
  });
  const text = `Bonjour ${firstName},\n\nConfirmez votre email : ${verifyUrl}\nLien valable ${expiresInHours} h.`;
  return { subject, html, text };
}

module.exports = { verifyEmailTemplate };