import { describe, expect, it } from "vitest";
import { addCredentialRequestSchema, rejectOrSuspendRequestSchema, updateTherapistProfileSchema } from "./therapists.js";

describe("updateTherapistProfileSchema", () => {
  const valid = {
    bio: "Experienced counsellor.",
    specialties: ["Stress and anxiety"],
    languages: ["en"],
    feeKES: 2500,
  };

  it("accepts a valid profile", () => {
    expect(updateTherapistProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty specialties array", () => {
    const result = updateTherapistProfileSchema.safeParse({ ...valid, specialties: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty languages array", () => {
    const result = updateTherapistProfileSchema.safeParse({ ...valid, languages: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive fee", () => {
    const result = updateTherapistProfileSchema.safeParse({ ...valid, feeKES: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a fractional fee", () => {
    const result = updateTherapistProfileSchema.safeParse({ ...valid, feeKES: 2500.5 });
    expect(result.success).toBe(false);
  });
});

describe("addCredentialRequestSchema", () => {
  it("accepts a valid credential type and URL", () => {
    const result = addCredentialRequestSchema.safeParse({
      type: "PROFESSIONAL_LICENSE",
      documentUrl: "https://storage.example.com/doc.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown credential type", () => {
    const result = addCredentialRequestSchema.safeParse({
      type: "NOT_A_REAL_TYPE",
      documentUrl: "https://storage.example.com/doc.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL documentUrl", () => {
    const result = addCredentialRequestSchema.safeParse({
      type: "CV",
      documentUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectOrSuspendRequestSchema", () => {
  it("rejects a reason shorter than 3 characters", () => {
    expect(rejectOrSuspendRequestSchema.safeParse({ reason: "no" }).success).toBe(false);
  });

  it("accepts a reasonable reason", () => {
    expect(rejectOrSuspendRequestSchema.safeParse({ reason: "Missing valid license" }).success).toBe(true);
  });
});
