/**
 * Tokens visuels PROTECK pour les emails.
 * Source unique : alignés sur la charte (tailwind.config.ts).
 */
const emailTheme = Object.freeze({
  brandName: 'PROTECK',
  logoCid: 'proteck-mark',
  colors: Object.freeze({
    navy: '#0B2545',
    blue: '#1D6FD8',
    amber: '#F5A524',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    ok: '#16A34A',
    warn: '#EA580C',
    error: '#DC2626',
    info: '#0EA5E9',
  }),
  fonts: Object.freeze({
    base: "Inter, 'Segoe UI', Roboto, Arial, sans-serif",
    heading: "'Arial Black', Inter, 'Segoe UI', Arial, sans-serif",
  }),
});

module.exports = { emailTheme };