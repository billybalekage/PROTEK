"use strict";

const mailer = require("../../../shared/infra/mailer");
const logger = require("../../../config/logger");
const mails = require("../mails/auth.mails");

const dispatch = (to, template, kind) => {
  Promise.resolve()
    .then(() => mailer.send({ to, ...template }))
    .catch((err) => {
      logger.error(
        { kind, err: { name: err.name, code: err.code } },
        "Échec de l'envoi d'un e-mail d'authentification",
      );
    });
};

module.exports = {
  sendEmailVerification: (user, { code }) =>
    dispatch(
      user.email,
      mails.emailVerification({ fullName: user.fullName, code }),
      "email_verification",
    ),
  sendPasswordReset: (user, { code }) =>
    dispatch(
      user.email,
      mails.passwordReset({ fullName: user.fullName, code }),
      "password_reset",
    ),
  sendAccountAlreadyExists: (user) =>
    dispatch(
      user.email,
      mails.accountAlreadyExists({ fullName: user.fullName }),
      "account_exists",
    ),
  sendPasswordChanged: (user) =>
    dispatch(
      user.email,
      mails.passwordChanged({ fullName: user.fullName }),
      "password_changed",
    ),
  sendNewDeviceLogin: (user, info) =>
    dispatch(
      user.email,
      mails.newDeviceLogin({ fullName: user.fullName, ...info }),
      "new_device",
    ),
  sendEmailChangeCode: ({ fullName, newEmail }, { code }) =>
    dispatch(
      newEmail,
      mails.emailChangeCode({ fullName, code }),
      "email_change_code",
    ),
  sendEmailChanged: ({ fullName, email }, { newEmail }) =>
    dispatch(
      email,
      mails.emailChanged({ fullName, newEmail }),
      "email_changed",
    ),
};
