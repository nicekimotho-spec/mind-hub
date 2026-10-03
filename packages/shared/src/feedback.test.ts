import { describe, expect, it } from "vitest";
import { createFeedbackRequestSchema } from "./feedback.js";

describe("createFeedbackRequestSchema", () => {
  it("accepts a valid rating with a comment", () => {
    expect(createFeedbackRequestSchema.safeParse({ rating: 5, comment: "Very helpful session." }).success).toBe(true);
  });

  it("accepts a valid rating with no comment", () => {
    expect(createFeedbackRequestSchema.safeParse({ rating: 3 }).success).toBe(true);
  });

  it("rejects a rating of 0", () => {
    expect(createFeedbackRequestSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(createFeedbackRequestSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("rejects a fractional rating", () => {
    expect(createFeedbackRequestSchema.safeParse({ rating: 4.5 }).success).toBe(false);
  });
});
