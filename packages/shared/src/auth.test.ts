import { describe, expect, it } from "vitest";
import { loginRequestSchema, passwordSchema, phoneSchema, registerRequestSchema } from "./auth.js";

describe("phoneSchema", () => {
  it.each(["0712345678", "0112345678", "+254712345678", "+254112345678"])(
    "accepts valid Kenyan number %s",
    (value) => {
      expect(phoneSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(["12345", "0812345678", "+1234567890", "071234567", "07123456789"])(
    "rejects invalid number %s",
    (value) => {
      expect(phoneSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("passwordSchema", () => {
  it("accepts a password with letters and numbers at min length", () => {
    expect(passwordSchema.safeParse("abcdefgh12").success).toBe(true);
  });

  it("rejects a password shorter than 10 characters", () => {
    expect(passwordSchema.safeParse("abc123").success).toBe(false);
  });

  it("rejects a password with no digits", () => {
    expect(passwordSchema.safeParse("abcdefghij").success).toBe(false);
  });

  it("rejects a password with no letters", () => {
    expect(passwordSchema.safeParse("1234567890").success).toBe(false);
  });
});

describe("registerRequestSchema", () => {
  it("accepts a valid client registration payload", () => {
    const result = registerRequestSchema.safeParse({
      role: "CLIENT",
      phone: "0712345678",
      password: "abcdefgh12",
      fullName: "Jane Client",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an ADMIN role at registration (not a self-registerable role)", () => {
    const result = registerRequestSchema.safeParse({
      role: "ADMIN",
      phone: "0712345678",
      password: "abcdefgh12",
      fullName: "Not Allowed",
    });
    expect(result.success).toBe(false);
  });

  it("lowercases and trims email", () => {
    const result = registerRequestSchema.safeParse({
      role: "CLIENT",
      phone: "0712345678",
      email: "  Jane@Example.COM ",
      password: "abcdefgh12",
      fullName: "Jane Client",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });
});

describe("loginRequestSchema", () => {
  it("rejects an empty password", () => {
    const result = loginRequestSchema.safeParse({ phone: "0712345678", password: "" });
    expect(result.success).toBe(false);
  });
});
