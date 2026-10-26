// server/src/features/auth/policies/password.policy.js
// Règles pures (aucune dépendance Express/Prisma) : retourne la liste des violations.

const { password: cfg } = require('../../../config/auth.config');

// Liste de base ; à enrichir ou remplacer par une liste plus large au besoin.
const COMMON_PASSWORDS = new Set([
  'password', 'motdepasse', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop',
  '123456', '1234567890', '123456789', 'abcdef', 'admin', 'administrateur',
  'bienvenue', 'welcome', 'letmein', 'iloveyou', 'soleil', 'dragon',
  'kinshasa', 'lubumbashi', 'goma', 'congo', 'congo243', 'rdc', 'protek',
]);

const normalizeForCommonCheck = (pwd) => {
  const lower = pwd.toLowerCase();
  // Retire les suffixes triviaux (chiffres, symboles) : "Password123!" -> "password"
  return { lower, base: lower.replace(/[\d!@#$%^&*._-]+$/, '') };
};

/**
 * @param {string} password
 * @param {{ email?: string, fullName?: string }} [context]
 * @returns {{ code: string, message: string }[]} vide si le mot de passe est conforme
 */
const evaluatePassword = (password, context = {}) => {
  const violations = [];
  const add = (code, message) => violations.push({ code, message });

  if (password.length < cfg.minLength) {
    add('TOO_SHORT', `Le mot de passe doit contenir au moins ${cfg.minLength} caractères.`);
  }
  // bcrypt tronque silencieusement au-delà de 72 octets : on refuse explicitement.
  if (Buffer.byteLength(password, 'utf8') > cfg.maxLength) {
    add('TOO_LONG', `Le mot de passe ne doit pas dépasser ${cfg.maxLength} octets.`);
  }
  if (!/\p{L}/u.test(password)) {
    add('NO_LETTER', 'Le mot de passe doit contenir au moins une lettre.');
  }
  if (!/\d/.test(password)) {
    add('NO_DIGIT', 'Le mot de passe doit contenir au moins un chiffre.');
  }

  const { lower, base } = normalizeForCommonCheck(password);
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(base)) {
    add('TOO_COMMON', 'Ce mot de passe est trop courant. Choisissez-en un plus original.');
  }

  const emailLocal = (context.email || '').split('@')[0].toLowerCase();
  if (emailLocal.length >= 3 && lower.includes(emailLocal)) {
    add('CONTAINS_EMAIL', "Le mot de passe ne doit pas contenir votre adresse e-mail.");
  }

  const nameTokens = (context.fullName || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 4);
  if (nameTokens.some((t) => lower.includes(t))) {
    add('CONTAINS_NAME', 'Le mot de passe ne doit pas contenir votre nom.');
  }

  return violations;
};

module.exports = { evaluatePassword };