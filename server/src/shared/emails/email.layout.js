const { emailTheme } = require('./email.theme');
const { escapeHtml, safeUrl } = require('./email.utils');

const { colors: c, fonts: f, logoCid, brandName } = emailTheme;

/**
 * Gabarit commun : en-tête bleu nuit + filet ambre, contenu, pied de page légal.
 * @param {object} p
 * @param {string} p.preheader  Texte d'aperçu affiché dans la boîte de réception
 * @param {string} p.contentHtml Corps (composants de email.components.js)
 * @param {string} p.appUrl     URL publique de l'application
 */
function renderLayout({ preheader = '', contentHtml, appUrl }) {
  const year = new Date().getFullYear();
  const base = safeUrl(appUrl);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background:${c.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.surface};border:1px solid ${c.border};border-radius:8px;overflow:hidden;">

          <!-- En-tête -->
          <tr>
            <td bgcolor="${c.navy}" style="padding:20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:14px;">
                    <img src="cid:${logoCid}" width="30" height="40" alt="" style="display:block;border:0;">
                  </td>
                  <td style="font-family:${f.heading};font-size:24px;font-weight:800;letter-spacing:3px;color:#FFFFFF;">
                    ${brandName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td bgcolor="${c.amber}" height="4" style="font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Contenu -->
          <tr><td style="padding:32px 28px;">${contentHtml}</td></tr>

          <!-- Pied de page -->
          <tr>
            <td style="background:${c.bg};border-top:1px solid ${c.border};padding:20px 28px;font-family:${f.base};font-size:12px;line-height:1.6;color:${c.textMuted};">
              ${brandName} est une aide à la conception et à la vérification. La validation finale
              et la signature du dossier incombent à l'ingénieur ou à l'électricien qualifié.
              <br><br>
              <a href="${base}" style="color:${c.blue};text-decoration:none;">Ouvrir ${brandName}</a>
              &nbsp;·&nbsp; © ${year} ${brandName}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { renderLayout };