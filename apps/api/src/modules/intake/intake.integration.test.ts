import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.matchResult.deleteMany(),
    prisma.intakeAssessment.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

const noRiskIntake = {
  presentingConcern: "Struggling with work-related stress.",
  concernTags: ["Stress and anxiety management"],
  availability: { days: ["MON", "TUE"], timesOfDay: ["EVENING"] },
  safetyAnswers: {
    hasThoughtsOfSelfHarm: false,
    hasPlanOrIntent: false,
    hasAccessToMeans: false,
    isInImmediateDanger: false,
  },
};

describe("POST /api/v1/intake", () => {
  it("creates an intake assessment for an authenticated client", async () => {
    const { accessToken, user } = await createTestUser("CLIENT");

    const res = await request(app)
      .post("/api/v1/intake")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(noRiskIntake);

    expect(res.status).toBe(201);
    expect(res.body.intake.riskLevel).toBe("NONE");
    expect(res.body.intake.blockedBooking).toBe(false);

    // The response never echoes back raw safety answers or free-text concern —
    // only what the client needs to proceed (id, riskLevel, blockedBooking).
    expect(res.body.intake.safetyAnswers).toBeUndefined();
    expect(res.body.intake.presentingConcern).toBeUndefined();

    const stored = await prisma.intakeAssessment.findUniqueOrThrow({ where: { id: res.body.intake.id } });
    expect(stored.clientId).toBe(user.id);
    expect(stored.concernTags).toEqual(["Stress and anxiety management"]);
  });

  it("flags CRITICAL risk and blockedBooking=true when immediate danger is indicated", async () => {
    const { accessToken } = await createTestUser("CLIENT");

    const res = await request(app)
      .post("/api/v1/intake")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...noRiskIntake, safetyAnswers: { ...noRiskIntake.safetyAnswers, isInImmediateDanger: true } });

    expect(res.status).toBe(201);
    expect(res.body.intake.riskLevel).toBe("CRITICAL");
    expect(res.body.intake.blockedBooking).toBe(true);
  });

  it("rejects a non-client (therapist) from submitting an intake", async () => {
    const { accessToken } = await createTestUser("THERAPIST");

    const res = await request(app)
      .post("/api/v1/intake")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(noRiskIntake);

    expect(res.status).toBe(403);
  });

  it("rejects an intake with no concern tags selected (400)", async () => {
    const { accessToken } = await createTestUser("CLIENT");

    const res = await request(app)
      .post("/api/v1/intake")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...noRiskIntake, concernTags: [] });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/intake/:id", () => {
  it("lets the owning client fetch their own intake", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const createRes = await request(app)
      .post("/api/v1/intake")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(noRiskIntake);

    const getRes = await request(app)
      .get(`/api/v1/intake/${createRes.body.intake.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.intake.id).toBe(createRes.body.intake.id);
  });

  it("returns 404 (not 403) for another client's intake", async () => {
    const { accessToken: ownerToken } = await createTestUser("CLIENT");
    const { accessToken: otherToken } = await createTestUser("CLIENT");

    const createRes = await request(app)
      .post("/api/v1/intake")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(noRiskIntake);

    const getRes = await request(app)
      .get(`/api/v1/intake/${createRes.body.intake.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(getRes.status).toBe(404);
  });
});
