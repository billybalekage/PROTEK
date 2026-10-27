const { renderLayout } = require('../email.layout');
const { title, paragraph, button, callout } = require('../email.components');

function resetPasswordTemplate({ firstName, resetUrl, expiresInMinutes, appUrl }) {
  const subject = 'Réinitialisation de votre mot de passe';
  const html = renderLayout({
    appUrl,
    preheader: 'Choisissez un nouveau mot de passe PROTECK.',
    contentHtml: [
      title('Nouveau mot de passe'),
      paragraph(`Bonjour ${firstName}, une réinitialisation de mot de passe a été demandée pour votre compte.`),
      button({ label: 'Choisir un nouveau mot de passe', url: resetUrl }),
      callout({
        type: 'warn',
        text: `Ce lien expire dans ${expiresInMinutes} minutes. Si vous n'avez rien demandé, ignorez cet email : votre mot de passe reste inchangé.`,
      }),
    ].join(''),
  });
  const text = `Bonjour ${firstName},\n\nRéinitialisez votre mot de passe : ${resetUrl}\nLien valable ${expiresInMinutes} minutes.`;
  return { subject, html, text };
}

module.exports = { resetPasswordTemplate };