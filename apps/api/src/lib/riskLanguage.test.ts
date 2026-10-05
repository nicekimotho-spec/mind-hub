import { describe, expect, it } from "vitest";
import { containsRiskLanguage } from "./riskLanguage.js";

describe("containsRiskLanguage", () => {
  it.each([
    "I've been thinking about suicide",
    "sometimes I want to die",
    "I keep hurting myself",
    "I just want to end it all",
    "nataka kufa",
  ])("flags %j", (text) => {
    expect(containsRiskLanguage(text)).toBe(true);
  });

  it.each(["See you on Tuesday!", "The deadline is killing me at work", "I died laughing at the meme"])(
    "doesn't flag %j",
    (text) => {
      expect(containsRiskLanguage(text)).toBe(false);
    },
  );
});
