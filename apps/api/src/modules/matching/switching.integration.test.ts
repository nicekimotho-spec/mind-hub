import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createCareRelationship, createTestUser } from "../../test/factories.js";

const app = createApp();

async function createIntake(clientId: string, blockedBooking = false) {
  return prisma.intakeAssessment.create({
    data: {
      clientId,
      presentingConcern: "Work stress",
      concernTags: ["Stress and anxiety management"],
      availability: { days: ["MON"], timesOfDay: ["EVENING"] },
      safetyAnswers: {},
      riskLevel: blockedBooking ? "CRITICAL" : "NONE",
      blockedBooking,
    },
  });
}

async function createActiveTherapist(fullName: string, specialties: string[] = ["Stress and anxiety management"]) {
  const { user } = await createTestUser("THERAPIST", { fullName });
  await prisma.therapistProfile.update({ where: { userId: user.id }, data: { status: "ACTIVE", specialties, feeKES: 2000 } });
  return user;
}

describe("POST /api/v1/matching/switch", () => {
  it("suggests other therapists, never the one being switched from", async () => {
    const { client, therapist } = await createCareRelationship();
    await prisma.therapistProfile.update({ where: { userId: therapist.user.id }, data: { specialties: ["Stress and anxiety management"] } });
    await createIntake(client.user.id);
    const other = await createActiveTherapist("Other Therapist");

    const res = await request(app)
      .post("/api/v1/matching/switch")
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ fromTherapistId: therapist.user.id, reason: "APPROACH", comment: "Wanted something more structured" });

    expect(res.status).toBe(200);
    const ids = res.body.therapists.map((t: { userId: string }) => t.userId);
    expect(ids).toContain(other.id);
    expect(ids).not.toContain(therapist.user.id);

    const record = await prisma.therapistSwitch.findUniqueOrThrow({ where: { id: res.body.switchId } });
    expect(record).toMatchObject({ clientId: client.user.id, fromTherapistId: therapist.user.id, reason: "APPROACH" });
  });

  it("also leaves out therapists the client switched away from earlier", async () => {
    const { client, therapist: first } = await createCareRelationship();
    await createIntake(client.user.id);
    const second = await createActiveTherapist("Second Therapist");
    const slot = await prisma.availabilitySlot.create({
      data: { therapistId: second.id, startTime: new Date(Date.now() + 86_400_000), endTime: new Date(Date.now() + 90_000_000), isBooked: true },
    });
    await prisma.booking.create({
      data: { clientId: client.user.id, therapistId: second.id, slotId: slot.id, status: "COMPLETED", expiresAt: new Date() },
    });
    const auth = { Authorization: `Bearer ${client.accessToken}` };

    await request(app).post("/api/v1/matching/switch").set(auth).send({ fromTherapistId: first.user.id, reason: "NOT_A_GOOD_FIT" });
    const res = await request(app).post("/api/v1/matching/switch").set(auth).send({ fromTherapistId: second.id, reason: "COST" });

    const ids = res.body.therapists.map((t: { userId: string }) => t.userId);
    expect(ids).not.toContain(first.user.id);
    expect(ids).not.toContain(second.id);
  });

  it("asks for an intake first when the client has none", async () => {
    const { client, therapist } = await createCareRelationship();

    const res = await request(app)
      .post("/api/v1/matching/switch")
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ fromTherapistId: therapist.user.id, reason: "PREFER_NOT_TO_SAY" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INTAKE_REQUIRED");
  });

  it("respects the safety-screening gate on the latest intake", async () => {
    const { client, therapist } = await createCareRelationship();
    await createIntake(client.user.id, true);

    const res = await request(app)
      .post("/api/v1/matching/switch")
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ fromTherapistId: therapist.user.id, reason: "OTHER" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BLOCKED_BY_SCREENING");
  });

  it("returns 404 for a therapist the client has never had a session with", async () => {
    const { client } = await createCareRelationship();
    await createIntake(client.user.id);
    const stranger = await createActiveTherapist("Stranger");

    const res = await request(app)
      .post("/api/v1/matching/switch")
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ fromTherapistId: stranger.id, reason: "OTHER" });

    expect(res.status).toBe(404);
  });

  it("is client-only", async () => {
    const { therapist } = await createCareRelationship();
    const res = await request(app)
      .post("/api/v1/matching/switch")
      .set("Authorization", `Bearer ${therapist.accessToken}`)
      .send({ fromTherapistId: therapist.user.id, reason: "OTHER" });
    expect(res.status).toBe(403);
  });

  it("counts switches in the admin overview", async () => {
    const { client, therapist } = await createCareRelationship();
    await createIntake(client.user.id);
    await request(app)
      .post("/api/v1/matching/switch")
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ fromTherapistId: therapist.user.id, reason: "AVAILABILITY" });
    const admin = await createTestUser("ADMIN");

    const res = await request(app).get("/api/v1/admin/reports/overview").set("Authorization", `Bearer ${admin.accessToken}`);
    expect(res.body.report.therapistSwitches).toBe(1);
  });
});
