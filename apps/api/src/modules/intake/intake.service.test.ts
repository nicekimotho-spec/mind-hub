import { describe, expect, it } from "vitest";
import { computeRiskAssessment } from "./intake.service.js";

const noRisk = {
  hasThoughtsOfSelfHarm: false,
  hasPlanOrIntent: false,
  hasAccessToMeans: false,
  isInImmediateDanger: false,
};

describe("computeRiskAssessment", () => {
  it("NONE, not blocked, when no risk indicators are present", () => {
    expect(computeRiskAssessment(noRisk)).toEqual({ riskLevel: "NONE", blockedBooking: false });
  });

  it("LOW, not blocked, for access-to-means alone without thoughts of self-harm", () => {
    expect(computeRiskAssessment({ ...noRisk, hasAccessToMeans: true })).toEqual({
      riskLevel: "LOW",
      blockedBooking: false,
    });
  });

  it("ELEVATED, not blocked, for thoughts of self-harm alone", () => {
    expect(computeRiskAssessment({ ...noRisk, hasThoughtsOfSelfHarm: true })).toEqual({
      riskLevel: "ELEVATED",
      blockedBooking: false,
    });
  });

  it("CRITICAL and blocked when thoughts of self-harm are combined with a plan or intent", () => {
    expect(computeRiskAssessment({ ...noRisk, hasThoughtsOfSelfHarm: true, hasPlanOrIntent: true })).toEqual({
      riskLevel: "CRITICAL",
      blockedBooking: true,
    });
  });

  it("CRITICAL and blocked when thoughts of self-harm are combined with access to means", () => {
    expect(computeRiskAssessment({ ...noRisk, hasThoughtsOfSelfHarm: true, hasAccessToMeans: true })).toEqual({
      riskLevel: "CRITICAL",
      blockedBooking: true,
    });
  });

  it("CRITICAL and blocked whenever immediate danger is indicated, regardless of other answers", () => {
    expect(computeRiskAssessment({ ...noRisk, isInImmediateDanger: true })).toEqual({
      riskLevel: "CRITICAL",
      blockedBooking: true,
    });
  });
});
