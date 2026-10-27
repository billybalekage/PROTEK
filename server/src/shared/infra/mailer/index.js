"use strict";

const { driver } = require("../../../config/mail.config");

const drivers = {
  smtp: () => require("./smtp.mailer"),
  console: () => require("./console.mailer"),
};

module.exports = drivers[driver]();
