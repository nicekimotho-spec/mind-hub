import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("verifies a matching plaintext against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple1");
    await expect(verifyPassword("correct-horse-battery-staple1", hash)).resolves.toBe(true);
  });

  it("rejects a non-matching plaintext", async () => {
    const hash = await hashPassword("correct-horse-battery-staple1");
    await expect(verifyPassword("wrong-password-123", hash)).resolves.toBe(false);
  });

  it("produces a different hash for the same input on each call (salted)", async () => {
    const hash1 = await hashPassword("same-password-123");
    const hash2 = await hashPassword("same-password-123");
    expect(hash1).not.toBe(hash2);
  });
});
