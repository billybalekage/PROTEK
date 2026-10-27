"use strict";

jest.mock("../repositories/otp.repository");

const otpRepository = require("../repositories/otp.repository");
const { hmacOtp } = require("../providers/hash.provider");
const service = require("../services/otp.service");

const NOW = new Date("2026-10-26T10:00:00Z");
const base = {
  userId: "user-1",
  purpose: "EMAIL_VERIFICATION",
  now: NOW,
};

beforeEach(() => {
  jest.resetAllMocks();
  otpRepository.findLastCreatedAt.mockResolvedValue(null);
  otpRepository.countCreatedSince.mockResolvedValue(0);
  otpRepository.consume.mockResolvedValue(true);
});

describe("OTP issue and rate limits", () => {
  test("stores a keyed HMAC instead of the plaintext code", async () => {
    otpRepository.create.mockResolvedValue({ id: "otp-1" });

    const result = await service.issue(base);

    expect(result.issued).toBe(true);
    expect(result.code).toMatch(/^\d{6}$/);
    const stored = otpRepository.create.mock.calls[0][0];
    expect(stored.codeHash).toBe(
      hmacOtp({
        userId: base.userId,
        purpose: base.purpose,
        code: result.code,
      }),
    );
    expect(JSON.stringify(stored)).not.toContain(result.code);
    expect(otpRepository.invalidateActive).toHaveBeenCalledWith(
      base.userId,
      base.purpose,
      NOW,
    );
  });

  test("blocks resend during the cooldown", async () => {
    otpRepository.findLastCreatedAt.mockResolvedValue(
      new Date(NOW.getTime() - 10_000),
    );

    await expect(service.issue(base)).resolves.toMatchObject({
      issued: false,
      reason: "COOLDOWN",
    });
    expect(otpRepository.create).not.toHaveBeenCalled();
  });

  test("limits sends per purpose to the configured hourly maximum", async () => {
    otpRepository.countCreatedSince.mockResolvedValue(5);

    await expect(service.issue(base)).resolves.toMatchObject({
      issued: false,
      reason: "RATE_LIMITED",
    });
    expect(otpRepository.create).not.toHaveBeenCalled();
  });
});

describe("OTP verification and consumption", () => {
  const code = "123456";
  const activeOtp = {
    id: "otp-1",
    codeHash: hmacOtp({
      userId: base.userId,
      purpose: base.purpose,
      code,
    }),
    target: null,
  };

  test("accepts the correct code", async () => {
    otpRepository.findLatestActive.mockResolvedValue(activeOtp);
    otpRepository.incrementAttempts.mockResolvedValue(1);

    await expect(
      service.verifyCode({ ...base, code }),
    ).resolves.toEqual({ id: "otp-1", target: null });
  });

  test("rejects when there is no active code", async () => {
    otpRepository.findLatestActive.mockResolvedValue(null);

    await expect(
      service.verifyCode({ ...base, code }),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
  });

  test("burns the code after the final incorrect attempt", async () => {
    otpRepository.findLatestActive.mockResolvedValue(activeOtp);
    otpRepository.incrementAttempts.mockResolvedValue(5);

    await expect(
      service.verifyCode({ ...base, code: "000000" }),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
    expect(otpRepository.consume).toHaveBeenCalledWith("otp-1", NOW);
  });

  test("rejects correct codes after the attempt limit was exceeded", async () => {
    otpRepository.findLatestActive.mockResolvedValue(activeOtp);
    otpRepository.incrementAttempts.mockResolvedValue(6);

    await expect(
      service.verifyCode({ ...base, code }),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
  });

  test("requires OTP consumption to succeed in the protected transaction", async () => {
    otpRepository.consume.mockResolvedValue(false);

    await expect(
      service.consumeCode("otp-1", NOW, {}),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
  });
});
