import { describe, expect, it } from "vitest";
import { intakeRequestSchema } from "./intake.js";

const validIntake = {
  presentingConcern: "Feeling overwhelmed at work and struggling to sleep.",
  concernTags: ["Stress and anxiety management"],
  availability: { days: ["MON", "WED"], timesOfDay: ["EVENING"] },
  safetyAnswers: {
    hasThoughtsOfSelfHarm: false,
    hasPlanOrIntent: false,
    hasAccessToMeans: false,
    isInImmediateDanger: false,
  },
};

describe("intakeRequestSchema", () => {
  it("accepts a valid intake", () => {
    expect(intakeRequestSchema.safeParse(validIntake).success).toBe(true);
  });

  it("rejects an empty concernTags array", () => {
    const result = intakeRequestSchema.safeParse({ ...validIntake, concernTags: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown concern tag", () => {
    const result = intakeRequestSchema.safeParse({ ...validIntake, concernTags: ["Not a real tag"] });
    expect(result.success).toBe(false);
  });

  it("rejects availability with no days selected", () => {
    const result = intakeRequestSchema.safeParse({
      ...validIntake,
      availability: { days: [], timesOfDay: ["EVENING"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing safetyAnswers field", () => {
    const { safetyAnswers: _drop, ...withoutSafety } = validIntake;
    expect(intakeRequestSchema.safeParse(withoutSafety).success).toBe(false);
  });
});
