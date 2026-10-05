import { describe, expect, it } from "vitest";
import { WORKSHEETS, validateWorksheetAnswers } from "./worksheets.js";

describe("validateWorksheetAnswers", () => {
  it("accepts partial answers of the right kinds", () => {
    expect(validateWorksheetAnswers("thought-record", { situation: "A meeting", intensityBefore: 7 })).toBeNull();
  });

  it("rejects a question the worksheet doesn't have", () => {
    expect(validateWorksheetAnswers("thought-record", { notAQuestion: "x" })).toMatch(/unknown question/i);
  });

  it("rejects a scale answer outside 0–10 or not a whole number", () => {
    expect(validateWorksheetAnswers("thought-record", { intensityBefore: 11 })).toMatch(/0 to 10/);
    expect(validateWorksheetAnswers("thought-record", { intensityBefore: 2.5 })).toMatch(/0 to 10/);
  });

  it("rejects a number for a written question", () => {
    expect(validateWorksheetAnswers("thought-record", { situation: 3 })).toMatch(/written answer/);
  });

  it("rejects an unknown worksheet", () => {
    expect(validateWorksheetAnswers("nope", {})).toMatch(/unknown worksheet/i);
  });
});

describe("WORKSHEETS", () => {
  it("has unique slugs and unique prompt ids within each worksheet", () => {
    expect(new Set(WORKSHEETS.map((w) => w.slug)).size).toBe(WORKSHEETS.length);
    for (const worksheet of WORKSHEETS) {
      const ids = worksheet.prompts.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
