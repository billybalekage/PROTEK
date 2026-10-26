// server/src/features/auth/validators/auth.validators.js
// Chaque schéma a la forme { body, query, params } attendue par le middleware validate().
// .strict() rejette tout champ inconnu : empêche le "mass assignment"
// (ex : un client qui enverrait accountType, status ou role).

const { z } = require('zod');
const c = require('./common.validators');

// --- Inscription et vérification e-mail -------------------------------------

const signup = z.object({
  body: z
    .object({
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      password: c.newPassword,
    })
    .strict()
    .superRefine((data, ctx) =>
      c.applyPasswordPolicy(data, ctx, {
        passwordKey: 'password',
        emailKey: 'email',
        fullNameKey: 'fullName',
      })
    ),
});

const verifyEmail = z.object({
  body: z.object({ email: c.email, code: c.otpCode }).strict(),
});

// Renvoi d'un code : uniquement pour les finalités accessibles sans être connecté.
const resendOtp = z.object({
  body: z
    .object({
      email: c.email,
      purpose: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET']),
    })
    .strict(),
});

// --- Connexion ---------------------------------------------------------------

const login = z.object({
  body: z
    .object({
      email: c.email,
      password: c.loginPassword,
      deviceName: z.string().trim().max(100).optional(),
      captchaToken: z.string().max(2048).optional(),
    })
    .strict(),
});

// Seconde étape quand la 2FA est activée (mfaToken court délivré par login).
const verifyTwoFactor = z.object({
  body: z
    .object({
      mfaToken: c.opaqueToken,
      code: c.otpCode,
    })
    .strict(),
});

// --- Jetons ------------------------------------------------------------------

// Web : refresh token dans un cookie httpOnly (body vide).
// Mobile/Desktop : refresh token dans le body. Le controller prend l'un ou l'autre.
const refresh = z.object({
  body: z.object({ refreshToken: c.opaqueToken.optional() }).strict().default({}),
});

const logout = refresh;

// --- Mot de passe oublié / changement ---------------------------------------

const forgotPassword = z.object({
  body: z.object({ email: c.email }).strict(),
});

const resetPassword = z.object({
  body: z
    .object({
      email: c.email,
      code: c.otpCode,
      newPassword: c.newPassword,
    })
    .strict()
    .superRefine((data, ctx) =>
      c.applyPasswordPolicy(data, ctx, { passwordKey: 'newPassword', emailKey: 'email' })
    ),
});

const changePassword = z.object({
  body: z
    .object({
      currentPassword: c.loginPassword,
      newPassword: c.newPassword,
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.newPassword === data.currentPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['newPassword'],
          message: "Le nouveau mot de passe doit être différent de l'actuel.",
        });
      }
      c.applyPasswordPolicy(data, ctx, { passwordKey: 'newPassword' });
    }),
});

// --- Changement d'e-mail -----------------------------------------------------

const requestEmailChange = z.object({
  body: z.object({ newEmail: c.email, currentPassword: c.loginPassword }).strict(),
});

const confirmEmailChange = z.object({
  body: z.object({ code: c.otpCode }).strict(),
});

// --- Sessions ----------------------------------------------------------------

const sessionIdParam = z.object({
  params: z.object({ sessionId: c.uuid }),
});

module.exports = {
  signup,
  verifyEmail,
  resendOtp,
  login,
  verifyTwoFactor,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  sessionIdParam,
};