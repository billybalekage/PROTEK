// server/src/features/auth/validators/common.validators.js
// Briques réutilisables : une seule définition par type de champ.

const { z } = require('zod');
const { otp: otpConfig } = require('../../../config/auth.config');
const { normalizePhone, isValidE164 } = require('../policies/phone.policy');
const { evaluatePassword } = require('../policies/password.policy');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "L'adresse e-mail est requise.")
  .max(254, "L'adresse e-mail est trop longue.")
  .email("Adresse e-mail invalide.");

const fullName = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(2, 'Le nom complet doit contenir au moins 2 caractères.')
      .max(100, 'Le nom complet ne doit pas dépasser 100 caractères.')
      .regex(/^[\p{L}\p{M}'. -]+$/u, 'Le nom complet contient des caractères non autorisés.')
  );

const phone = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine(isValidE164, 'Numéro de téléphone invalide (ex : 081 234 5678 ou +243 81 234 5678).');

// Mot de passe SAISI pour se connecter : aucune règle de politique (anciens mots de passe),
// seulement une borne haute contre les entrées abusives.
const loginPassword = z
  .string()
  .min(1, 'Le mot de passe est requis.')
  .max(128, 'Mot de passe trop long.');

// Nouveau mot de passe : la politique est appliquée au niveau de l'objet (voir applyPasswordPolicy).
const newPassword = z.string().min(1, 'Le nouveau mot de passe est requis.');

const otpCode = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${otpConfig.length}}$`), `Le code doit contenir ${otpConfig.length} chiffres.`);

const opaqueToken = z.string().min(20, 'Jeton invalide.').max(512, 'Jeton invalide.');

const uuid = z.string().uuid('Identifiant invalide.');

/**
 * À appeler dans un superRefine d'objet : ajoute une issue par violation de la politique,
 * en utilisant l'e-mail et le nom du même objet comme contexte (anti mot de passe prévisible).
 */
const applyPasswordPolicy = (data, ctx, { passwordKey, emailKey, fullNameKey } = {}) => {
  const violations = evaluatePassword(data[passwordKey], {
    email: emailKey ? data[emailKey] : undefined,
    fullName: fullNameKey ? data[fullNameKey] : undefined,
  });
  violations.forEach((v) =>
    ctx.addIssue({ code: 'custom', path: [passwordKey], message: v.message })
  );
};

module.exports = {
  email,
  fullName,
  phone,
  loginPassword,
  newPassword,
  otpCode,
  opaqueToken,
  uuid,
  applyPasswordPolicy,
};