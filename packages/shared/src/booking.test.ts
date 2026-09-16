import { describe, expect, it } from "vitest";
import { createSlotRequestSchema } from "./booking.js";

describe("createSlotRequestSchema", () => {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);

  it("accepts a valid future slot", () => {
    const result = createSlotRequestSchema.safeParse({
      startTime: inOneHour.toISOString(),
      endTime: inTwoHours.toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects endTime before startTime", () => {
    const result = createSlotRequestSchema.safeParse({
      startTime: inTwoHours.toISOString(),
      endTime: inOneHour.toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects equal startTime and endTime", () => {
    const result = createSlotRequestSchema.safeParse({
      startTime: inOneHour.toISOString(),
      endTime: inOneHour.toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a startTime in the past", () => {
    const inThePast = new Date(Date.now() - 60 * 60 * 1000);
    const result = createSlotRequestSchema.safeParse({
      startTime: inThePast.toISOString(),
      endTime: inOneHour.toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
