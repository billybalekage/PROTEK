"use strict";

jest.mock("../../../shared/infra/prisma", () => ({
  prisma: {},
  runInTransaction: jest.fn((callback) => callback({})),
}));
jest.mock("../../../shared/audit/audit.repository");
jest.mock("../repositories/user.repository");
jest.mock("../repositories/session.repository");
jest.mock("../services/otp.service");
jest.mock("../services/lockout.service");
jest.mock("../services/token.service");
jest.mock("../services/authMailer.service");
jest.mock("../providers/captcha.provider");
jest.mock("../providers/hash.provider", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed-password"),
  verifyPassword: jest.fn(),
}));

const auditRepository = require("../../../shared/audit/audit.repository");
const userRepository = require("../repositories/user.repository");
const sessionRepository = require("../repositories/session.repository");
const otpService = require("../services/otp.service");
const lockoutService = require("../services/lockout.service");
const tokenService = require("../services/token.service");
const authMailer = require("../services/authMailer.service");
const captcha = require("../providers/captcha.provider");
const {
  hashPassword,
  verifyPassword,
} = require("../providers/hash.provider");
const { runInTransaction } = require("../../../shared/infra/prisma");
const {
  EmailAlreadyUsedError,
} = require("../../../shared/errors/auth.error");
const service = require("../services/auth.service");

const NOW = new Date("2026-10-26T10:00:00Z");
const PASSWORD = "Kivu-Lumiere-7421";
const signupInput = {
  fullName: "Jean Kabila",
  email: "jean@example.cd",
  phone: "+243812345678",
  password: PASSWORD,
};
const makeUser = (overrides = {}) => ({
  id: "user-1",
  email: signupInput.email,
  fullName: signupInput.fullName,
  phone: signupInput.phone,
  accountType: "PERSONAL",
  status: "ACTIVE",
  emailVerifiedAt: NOW,
  twoFactorEnabled: false,
  passwordHash: "stored-hash",
  failedLoginCount: 0,
  lastFailedLoginAt: null,
  lockoutLevel: 0,
  lockedUntil: null,
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  runInTransaction.mockImplementation((callback) => callback({}));
  hashPassword.mockResolvedValue("hashed-password");
  otpService.issue.mockResolvedValue({
    issued: true,
    code: "123456",
    expiresAt: NOW,
  });
  lockoutService.isCaptchaRequired.mockReturnValue(false);
  sessionRepository.deviceFootprint.mockResolvedValue({
    total: 0,
    matching: 0,
  });
  tokenService.startSession.mockResolvedValue({
    sessionId: "session-1",
    accessToken: "access",
    refreshToken: "refresh",
  });
});

describe("signup and email verification", () => {
  test("creates a pending account, emits verification and returns a generic result", async () => {
    userRepository.create.mockResolvedValue({
      id: "user-1",
      email: signupInput.email,
      fullName: signupInput.fullName,
    });

    await expect(
      service.signup(signupInput, { now: NOW }),
    ).resolves.toEqual({ status: "VERIFICATION_PENDING" });
    expect(otpService.issue).toHaveBeenCalledWith({
      userId: "user-1",
      purpose: "EMAIL_VERIFICATION",
      now: NOW,
    });
    expect(authMailer.sendEmailVerification).toHaveBeenCalled();
  });

  test("keeps the same signup response when an active account exists", async () => {
    userRepository.create.mockRejectedValue(new EmailAlreadyUsedError());
    userRepository.findPublicByEmail.mockResolvedValue(
      makeUser({ status: "ACTIVE" }),
    );

    await expect(
      service.signup(signupInput, { now: NOW }),
    ).resolves.toEqual({ status: "VERIFICATION_PENDING" });
    expect(authMailer.sendAccountAlreadyExists).toHaveBeenCalled();
    expect(otpService.issue).not.toHaveBeenCalled();
  });

  test("does not replace the password of an unverified existing account", async () => {
    userRepository.create.mockRejectedValue(new EmailAlreadyUsedError());
    userRepository.findPublicByEmail.mockResolvedValue(
      makeUser({ status: "PENDING_VERIFICATION" }),
    );

    await service.signup(signupInput, { now: NOW });

    expect(userRepository.updatePasswordHash).not.toHaveBeenCalled();
    expect(authMailer.sendEmailVerification).toHaveBeenCalled();
  });

  test("verifies the OTP and activates the account in one transaction", async () => {
    userRepository.findPublicByEmail.mockResolvedValue(
      makeUser({ status: "PENDING_VERIFICATION" }),
    );
    otpService.verifyCode.mockResolvedValue({ id: "otp-1" });
    userRepository.markEmailVerified.mockResolvedValue(true);

    await expect(
      service.verifyEmail(
        { email: signupInput.email, code: "123456" },
        { now: NOW },
      ),
    ).resolves.toEqual({ status: "VERIFIED" });
    expect(otpService.consumeCode).toHaveBeenCalledWith(
      "otp-1",
      NOW,
      expect.anything(),
    );
    expect(userRepository.markEmailVerified).toHaveBeenCalledWith(
      "user-1",
      NOW,
      expect.anything(),
    );
  });

  test("returns the same resend result for unknown emails", async () => {
    userRepository.findPublicByEmail.mockResolvedValue(null);

    await expect(
      service.resendVerification({ email: signupInput.email }),
    ).resolves.toEqual({ status: "IF_ELIGIBLE_CODE_SENT" });
    expect(otpService.issue).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  const credentials = { email: signupInput.email, password: PASSWORD };

  test("equalizes timing and hides unknown email addresses", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(null);

    await expect(
      service.login(credentials, { now: NOW }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(verifyPassword).toHaveBeenCalledWith(PASSWORD, null);
    expect(lockoutService.recordFailure).not.toHaveBeenCalled();
  });

  test("requires CAPTCHA when lockout policy says so", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(makeUser());
    lockoutService.isCaptchaRequired.mockReturnValue(true);
    captcha.verify.mockResolvedValue(false);

    await expect(
      service.login(credentials, { now: NOW }),
    ).rejects.toMatchObject({ code: "CAPTCHA_REQUIRED" });
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  test("returns captchaRequired after an incorrect password without exposing secrets", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(makeUser());
    verifyPassword.mockResolvedValue(false);
    lockoutService.recordFailure.mockResolvedValue({
      locked: false,
      captchaRequired: true,
    });

    await expect(
      service.login(credentials, { now: NOW }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      details: { captchaRequired: true },
    });
  });

  test("creates a session after successful login and returns only public user fields", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(
      makeUser({ failedLoginCount: 2 }),
    );
    verifyPassword.mockResolvedValue(true);

    const result = await service.login(credentials, {
      now: NOW,
      userAgent: "Test agent",
      ipAddress: "127.0.0.1",
    });

    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.tokens.sessionId).toBe("session-1");
    expect(tokenService.startSession).toHaveBeenCalledWith({
      user: expect.objectContaining({ id: "user-1" }),
      device: { userAgent: "Test agent", ipAddress: "127.0.0.1" },
      now: NOW,
    });
    expect(lockoutService.clearOnSuccess).toHaveBeenCalledWith("user-1");
  });

  test("refuses suspended and pending accounts after correct password validation", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(
      makeUser({ status: "SUSPENDED" }),
    );
    verifyPassword.mockResolvedValue(true);
    await expect(
      service.login(credentials, { now: NOW }),
    ).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });

    userRepository.findAuthByEmail.mockResolvedValue(
      makeUser({ status: "PENDING_VERIFICATION" }),
    );
    await expect(
      service.login(credentials, { now: NOW }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    expect(authMailer.sendEmailVerification).toHaveBeenCalled();
    expect(tokenService.startSession).not.toHaveBeenCalled();
  });

  test("alerts only when an account has connected from an unseen device", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(makeUser());
    verifyPassword.mockResolvedValue(true);
    sessionRepository.deviceFootprint.mockResolvedValue({
      total: 2,
      matching: 0,
    });

    await service.login(credentials, { now: NOW, userAgent: "New agent" });

    expect(authMailer.sendNewDeviceLogin).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.objectContaining({ userAgent: "New agent", at: NOW }),
    );
  });
});

describe("password recovery", () => {
  test("does not reveal whether an email exists", async () => {
    userRepository.findPublicByEmail.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: "unknown@example.cd" }, { now: NOW }),
    ).resolves.toEqual({ status: "IF_ACCOUNT_EXISTS_CODE_SENT" });
    expect(authMailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  test("resets the password and revokes sessions atomically", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(makeUser());
    otpService.verifyCode.mockResolvedValue({ id: "otp-1" });

    await expect(
      service.resetPassword(
        {
          email: signupInput.email,
          code: "123456",
          newPassword: "Nouveau-Mdp-8842",
        },
        { now: NOW },
      ),
    ).resolves.toEqual({ status: "PASSWORD_UPDATED" });
    expect(userRepository.updatePasswordHash).toHaveBeenCalledWith(
      "user-1",
      "hashed-password",
      expect.anything(),
    );
    expect(tokenService.revokeAllSessions).toHaveBeenCalledWith(
      "user-1",
      { now: NOW },
      expect.anything(),
    );
    expect(authMailer.sendPasswordChanged).toHaveBeenCalled();
  });

  test("rejects weak new passwords before counting an OTP attempt", async () => {
    userRepository.findAuthByEmail.mockResolvedValue(makeUser());

    await expect(
      service.resetPassword(
        {
          email: signupInput.email,
          code: "123456",
          newPassword: "Ab1",
        },
        { now: NOW },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(otpService.verifyCode).not.toHaveBeenCalled();
  });
});
