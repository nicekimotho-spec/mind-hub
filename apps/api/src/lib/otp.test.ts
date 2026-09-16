import { describe, expect, it } from "vitest";
import { generateOtpCode, hashOtpCode } from "./otp.js";

describe("generateOtpCode", () => {
  it("always produces a 6-digit numeric string, zero-padded", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("is deterministic for the same code", () => {
    expect(hashOtpCode("123456")).toBe(hashOtpCode("123456"));
  });

  it("differs for different codes", () => {
    expect(hashOtpCode("123456")).not.toBe(hashOtpCode("654321"));
  });
});
