const AppError = require("./AppError");

class InvalidCredentialsError extends AppError {
  constructor({ captchaRequired = false } = {}) {
    super("E-mail ou mot de passe incorrect.", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      details: captchaRequired ? { captchaRequired: true } : undefined,
    });
  }
}

class AccountLockedError extends AppError {
  constructor(lockedUntil) {
    super(
      "Compte temporairement verrouillé suite à trop de tentatives échouées",
      {
        statusCode: 403,
        code: "ACCOUNT_LOCKED",
        details: { lockedUntil },
      },
    );
  }
}

class CaptchaRequiredError extends AppError {
  constructor() {
    super("Une verification CAPTCHA est requise pour continuer.", {
      statusCode: 429,
    code: "CAPTCHA_REQUIRED",
    });
  }
}

class EmailNotVerifiedError extends AppError {
  constructor() {
    super("Veuilllez confirmer votre address mail avant de vous connecter", {
      statusCode: 403,
      code: "EMAIL_NOT_VERIFIED",
    });
  }
}

class AccountSuspendedError extends AppError {
  constructor() {
    super("Ce compte est suspendu. Contacter le support", {
      statusCode: 403,
      code: "ACCOUNT_SUSPENDED",
    });
  }
}

class TwoFactorRequiredError extends AppError {
  constructor() {
    super("La vérification à deux facteurs est requise mais pas encore disponible.", {
      statusCode: 501,
      code: "MFA_REQUIRED",
    });
  }
}

class TokenInvalidError extends AppError {
  constructor(message = "Jeton invalide ou expiré.") {
    super(message, {
      statusCode: 401,
      code: "TOKEN_INVALID",
    });
  }
}

class TokenReuseDetectedError extends AppError {
  constructor() {
    super(
      "Activité suspecte détécté : toutes vos sessions on été fermées. Reconnectez-vous.",
      {
        statusCode: 401,
        code: "TOKEN_REUSE_DETECTED",
      },
    );
  }
}

class WrongCurrentPasswordError extends AppError {
  constructor() {
    super("Le mot de passe actuel est incorrect.", {
      statusCode: 403,
      code: "CURRENT_PASSWORD_INVALID",
    });
  }
}

class OtpInvalidError extends AppError {
  constructor() {
    super("Code de vérification invalide ou expiré.", {
      statusCode: 400,
      code: "OTP_INVALID",
    });
  }
}

class EmailAlreadyUsedError extends AppError {
  constructor() {
    super(
      "Impossible de créer le compte avec cet email. elle est deja utilisé !",
      {
        statusCode: 409,
        code: "EMAIL_ALREADY_USED",
      },
    );
  }
}

class ForbiddenError extends AppError {
  constructor(
    message = "Vous n'avez pas les droits nécessaire pour cette action.",
  ) {
    super(message, {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

module.exports = {
  InvalidCredentialsError,
  InvalidCreadentielsError: InvalidCredentialsError,
  AccountLockedError,
  CaptchaRequiredError,
  ForbiddenError,
  AccountSuspendedError,
  TwoFactorRequiredError,
  EmailAlreadyUsedError,
  EmailNotVerifiedError,
  TokenInvalidError,
  TokenReuseDetectedError,
  WrongCurrentPasswordError,
  OtpInvalidError,
};
