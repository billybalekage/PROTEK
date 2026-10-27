"use strict";

if (process.env.NODE_ENV === "production") {
  throw new Error('Le driver mail "console" est interdit en production.');
}

const send = async ({ to, subject, text }) => {
  console.log(
    `\n--- E-MAIL (console) ---\nÀ : ${to}\nObjet : ${subject}\n\n${text}\n------------------------\n`,
  );
};

module.exports = { send };
