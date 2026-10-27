"use strict";

const nodemailer = require("nodemailer");
const { from, smtp } = require("../../../config/mail.config");

if (!smtp.host) {
  throw new Error("MAIL_HOST est requis avec MAIL_DRIVER=smtp.");
}
if ((smtp.user && !smtp.pass) || (!smtp.user && smtp.pass)) {
  throw new Error("MAIL_USER et MAIL_PASS doivent être configurés ensemble.");
}

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      pool: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
};

const send = async ({ to, subject, html, text }) => {
  await getTransporter().sendMail({ from, to, subject, html, text });
};

module.exports = { send };
