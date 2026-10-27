/** Échappe le HTML : toute donnée utilisateur injectée dans un template passe par ici. */
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** N'autorise que http(s) dans les liens ; sinon renvoie '#'. */
function safeUrl(url) {
  try {
    const parsed = new globalThis.URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '#';
  } catch {
    return '#';
  }
}

module.exports = { escapeHtml, safeUrl };