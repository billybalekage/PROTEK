const { renderLayout } = require('../email.layout');
const { title, paragraph, button } = require('../email.components');

function welcomeTemplate({ firstName, appUrl }) {
  const subject = 'Bienvenue sur PROTECK';
  const html = renderLayout({
    appUrl,
    preheader: 'Votre compte est prêt : dimensionnez vos installations en quelques minutes.',
    contentHtml: [
      title(`Bienvenue, ${firstName} !`),
      paragraph('Votre compte PROTECK est prêt. Calculez vos sections de câbles, vérifiez la chute de tension et la sélectivité, puis générez vos rapports PDF normalisés.'),
      button({ label: 'Créer mon premier projet', url: appUrl }),
    ].join(''),
  });
  const text = `Bienvenue, ${firstName} !\n\nVotre compte PROTECK est prêt.\nAccéder à l'application : ${appUrl}`;
  return { subject, html, text };
}

module.exports = { welcomeTemplate };