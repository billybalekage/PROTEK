const { emailTheme } = require('./email.theme');
const { escapeHtml, safeUrl } = require('./email.utils');

const { colors: c, fonts: f } = emailTheme;

const title = (text) =>
  `<h1 style="margin:0 0 16px;font-family:${f.heading};font-size:24px;line-height:1.3;color:${c.navy};">${escapeHtml(text)}</h1>`;

const paragraph = (text) =>
  `<p style="margin:0 0 16px;font-family:${f.base};font-size:16px;line-height:1.6;color:${c.text};">${escapeHtml(text)}</p>`;

const muted = (text) =>
  `<p style="margin:16px 0 0;font-family:${f.base};font-size:13px;line-height:1.5;color:${c.textMuted};">${escapeHtml(text)}</p>`;

/** Bouton "bulletproof" : fonctionne aussi dans Outlook. */
const button = ({ label, url }) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td bgcolor="${c.blue}" style="border-radius:6px;">
      <a href="${safeUrl(url)}" style="display:inline-block;padding:14px 28px;font-family:${f.base};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;

const CALLOUT_STYLES = {
  ok: { color: c.ok, icon: '✓', label: 'Conforme' },
  warn: { color: c.warn, icon: '⚠', label: 'Attention' },
  error: { color: c.error, icon: '✕', label: 'Non conforme' },
  info: { color: c.info, icon: 'i', label: 'Information' },
};

/** Encadré de statut : icône + libellé + couleur (jamais la couleur seule). */
const callout = ({ type = 'info', text }) => {
  const s = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.info;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td style="border-left:4px solid ${s.color};background:${c.bg};padding:12px 16px;font-family:${f.base};font-size:14px;line-height:1.5;color:${c.text};">
      <strong style="color:${s.color};">${s.icon} ${s.label} :</strong> ${escapeHtml(text)}
    </td>
  </tr>
</table>`;
};

module.exports = { title, paragraph, muted, button, callout };