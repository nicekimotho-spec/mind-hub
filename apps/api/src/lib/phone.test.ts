import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("passes through numbers already in +254 form", () => {
    expect(normalizePhone("+254712345678")).toBe("+254712345678");
  });

  it("converts a leading 0 to +254", () => {
    expect(normalizePhone("0712345678")).toBe("+254712345678");
  });

  it("trims surrounding whitespace before normalizing", () => {
    expect(normalizePhone("  0712345678  ")).toBe("+254712345678");
  });

  it("throws for a number that matches neither prefix", () => {
    expect(() => normalizePhone("712345678")).toThrow();
  });
});
