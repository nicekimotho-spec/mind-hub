import { describe, expect, it } from "vitest";
import { createComplaintRequestSchema, updateComplaintRequestSchema } from "./complaints.js";

describe("createComplaintRequestSchema", () => {
  it("rejects a description shorter than 10 characters", () => {
    expect(createComplaintRequestSchema.safeParse({ description: "too short" }).success).toBe(false);
  });

  it("accepts a reasonable description", () => {
    expect(createComplaintRequestSchema.safeParse({ description: "My therapist was late for two sessions in a row." }).success).toBe(true);
  });
});

describe("updateComplaintRequestSchema", () => {
  it("accepts OPEN -> IN_REVIEW with no resolution", () => {
    expect(updateComplaintRequestSchema.safeParse({ status: "IN_REVIEW" }).success).toBe(true);
  });

  it("rejects RESOLVED with no resolution note", () => {
    expect(updateComplaintRequestSchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
  });

  it("accepts RESOLVED with a resolution note", () => {
    expect(updateComplaintRequestSchema.safeParse({ status: "RESOLVED", resolution: "Issued a refund and spoke with the therapist." }).success).toBe(true);
  });

  it("rejects CLOSED with no resolution note", () => {
    expect(updateComplaintRequestSchema.safeParse({ status: "CLOSED" }).success).toBe(false);
  });
});
