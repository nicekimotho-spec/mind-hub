import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.consentVersion.deleteMany(),
  ]);
});

async function seedConsentVersion(version = 1, effectiveAt = new Date()) {
  return prisma.consentVersion.create({ data: { version, content: `Consent text v${version}`, effectiveAt } });
}

async function createBooking() {
  const { user: therapistUser } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
  });
  const { accessToken, user: client } = await createTestUser("CLIENT");
  const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId: slot.id });
  return { bookingId: bookRes.body.booking.id as string, clientToken: accessToken, clientId: client.id };
}

describe("GET /api/v1/consent/current-version", () => {
  it("returns the highest published version whose effective date has passed", async () => {
    await seedConsentVersion(1, new Date(Date.now() - 60_000));
    await seedConsentVersion(2, new Date(Date.now() - 30_000));
    await seedConsentVersion(3, new Date(Date.now() + 60 * 60 * 1000)); // not yet effective

    const res = await request(app).get("/api/v1/consent/current-version");
    expect(res.status).toBe(200);
    expect(res.body.consentVersion.version).toBe(2);
  });

  it("404s if no consent version has ever been published", async () => {
    const res = await request(app).get("/api/v1/consent/current-version");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/bookings/:id/consent", () => {
  it("records consent against the currently published version", async () => {
    const version = await seedConsentVersion(1);
    const { bookingId, clientToken } = await createBooking();

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/consent`).set("Authorization", `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.consent.consentVersionId).toBe(version.id);
    expect(res.body.consent.bookingId).toBe(bookingId);
  });

  it("rejects consent for someone else's booking (404)", async () => {
    await seedConsentVersion(1);
    const { bookingId } = await createBooking();
    const { accessToken: otherToken } = await createTestUser("CLIENT");

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/consent`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("re-consenting after a new version is published updates the same record to the new version", async () => {
    const v1 = await seedConsentVersion(1);
    const { bookingId, clientToken } = await createBooking();

    const first = await request(app).post(`/api/v1/bookings/${bookingId}/consent`).set("Authorization", `Bearer ${clientToken}`);
    expect(first.body.consent.consentVersionId).toBe(v1.id);

    const v2 = await seedConsentVersion(2);
    const second = await request(app).post(`/api/v1/bookings/${bookingId}/consent`).set("Authorization", `Bearer ${clientToken}`);
    expect(second.body.consent.consentVersionId).toBe(v2.id);

    const allRecords = await prisma.consentRecord.findMany({ where: { bookingId } });
    expect(allRecords).toHaveLength(1); // updated in place, not a second row
  });
});
