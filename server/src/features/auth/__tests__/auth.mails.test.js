"use strict";

const mails = require("../mails/auth.mails");

describe("authentication email templates", () => {
  test("escapes user-provided values in verification messages", () => {
    const message = mails.emailVerification({
      fullName: "<img src=x onerror=alert(1)>",
      code: "012345",
    });

    expect(message.subject).toContain("PROTEK");
    expect(message.text).toContain("012345");
    expect(message.html).toContain("&lt;img");
    expect(message.html).not.toContain("<img src=x");
    expect(message.html).toContain("012345");
  });

  test("includes password reset recovery guidance", () => {
    const message = mails.passwordReset({
      fullName: "Jean",
      code: "654321",
    });

    expect(message.text).toContain("654321");
    expect(message.text).toContain("mot de passe actuel reste inchangé");
  });

  test("uses the configured sign-in link in existing-account notices", () => {
    const message = mails.accountAlreadyExists({ fullName: "Jean" });

    expect(message.html).toContain("/login");
    expect(message.text).toContain("/login");
  });
});
