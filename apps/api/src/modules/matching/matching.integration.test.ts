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

const baseIntake = {
  presentingConcern: "Grieving the loss of a parent.",
  concernTags: ["Grief and life transitions"],
  availability: { days: ["SAT"], timesOfDay: ["MORNING"] },
  safetyAnswers: {
    hasThoughtsOfSelfHarm: false,
    hasPlanOrIntent: false,
    hasAccessToMeans: false,
    isInImmediateDanger: false,
  },
};

async function createIntake(accessToken: string, overrides: Partial<typeof baseIntake> = {}) {
  const res = await request(app)
    .post("/api/v1/intake")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ ...baseIntake, ...overrides });
  return res.body.intake.id as string;
}

async function makeActiveTherapist(specialties: string[], languages: string[] = ["en"], feeKES = 2000) {
  const { user } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({
    where: { userId: user.id },
    data: { status: "ACTIVE", specialties, languages, feeKES },
  });
  return user.id;
}

describe("POST /api/v1/matching/:intakeId", () => {
  it("returns only ACTIVE therapists, ranked by specialty overlap", async () => {
    const griefTherapist = await makeActiveTherapist(["Grief and life transitions"]);
    const unrelatedTherapist = await makeActiveTherapist(["Workplace wellbeing"]);
    // A pending (not yet verified) therapist with a matching specialty must never appear.
    const { user: pendingTherapist } = await createTestUser("THERAPIST");
    await prisma.therapistProfile.update({
      where: { userId: pendingTherapist.id },
      data: { specialties: ["Grief and life transitions"] },
    });

    const { accessToken } = await createTestUser("CLIENT");
    const intakeId = await createIntake(accessToken);

    const res = await request(app).post(`/api/v1/matching/${intakeId}`).set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.match.therapists.map((t: { userId: string }) => t.userId);
    expect(ids).toContain(griefTherapist);
    expect(ids).not.toContain(pendingTherapist.id);
    // The grief specialist should outrank the unrelated one given higher overlap.
    expect(ids.indexOf(griefTherapist)).toBeLessThan(ids.indexOf(unrelatedTherapist));
  });

  it("never returns more than 5 therapists", async () => {
    for (let i = 0; i < 7; i++) {
      await makeActiveTherapist(["Grief and life transitions"]);
    }
    const { accessToken } = await createTestUser("CLIENT");
    const intakeId = await createIntake(accessToken);

    const res = await request(app).post(`/api/v1/matching/${intakeId}`).set("Authorization", `Bearer ${accessToken}`);
    expect(res.body.match.therapists.length).toBeLessThanOrEqual(5);
  });

  it("rejects matching for a blocked (CRITICAL risk) intake with 400, not silently returning empty matches", async () => {
    await makeActiveTherapist(["Grief and life transitions"]);
    const { accessToken } = await createTestUser("CLIENT");
    const intakeId = await createIntake(accessToken, {
      safetyAnswers: { ...baseIntake.safetyAnswers, isInImmediateDanger: true },
    });

    const res = await request(app).post(`/api/v1/matching/${intakeId}`).set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BLOCKED_BY_SCREENING");

    const matchResult = await prisma.matchResult.findUnique({ where: { intakeId } });
    expect(matchResult).toBeNull();
  });

  it("rejects a client matching against another client's intake (404)", async () => {
    const { accessToken: ownerToken } = await createTestUser("CLIENT");
    const { accessToken: otherToken } = await createTestUser("CLIENT");
    const intakeId = await createIntake(ownerToken);

    const res = await request(app).post(`/api/v1/matching/${intakeId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("is idempotent — a second call returns the same stored match rather than recomputing", async () => {
    await makeActiveTherapist(["Grief and life transitions"]);
    const { accessToken } = await createTestUser("CLIENT");
    const intakeId = await createIntake(accessToken);

    const first = await request(app).post(`/api/v1/matching/${intakeId}`).set("Authorization", `Bearer ${accessToken}`);
    const second = await request(app).post(`/api/v1/matching/${intakeId}`).set("Authorization", `Bearer ${accessToken}`);

    expect(first.body.match.id).toBe(second.body.match.id);

    const allMatches = await prisma.matchResult.findMany({ where: { intakeId } });
    expect(allMatches).toHaveLength(1);
  });
});
