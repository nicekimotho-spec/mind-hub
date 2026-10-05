import { describe, expect, it } from "vitest";
import { formatGiftCode, generateGiftCode, normalizeGiftCode } from "./giftCode.js";

describe("gift codes", () => {
  it("generates 10 unambiguous characters", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateGiftCode()).toMatch(/^[A-HJKMNP-Z2-9]{10}$/);
    }
  });

  it("normalizes case, dashes and spaces", () => {
    expect(normalizeGiftCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    expect(normalizeGiftCode("ABCDE FGHJK")).toBe("ABCDEFGHJK");
  });

  it("formats with a dash in the middle", () => {
    expect(formatGiftCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
  });
});
