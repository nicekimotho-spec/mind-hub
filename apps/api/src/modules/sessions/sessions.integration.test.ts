import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";
import { signAccessToken } from "../../lib/jwt.js";
import * as sessionsService from "./sessions.service.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.safeguardingIncident.deleteMany(),
    prisma.session.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.consentVersion.deleteMany(),
  ]);
});

async function seedConsentVersion(version = 1) {
  return prisma.consentVersion.create({ data: { version, content: `v${version}`, effectiveAt: new Date() } });
}

/** Builds a CONFIRMED booking with a slot starting `startOffsetMs` from now. */
async function createConfirmedBooking(startOffsetMs: number) {
  const { user: therapistUser, accessToken: therapistToken } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
  const startTime = new Date(Date.now() + startOffsetMs);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
  });
  const { accessToken: clientToken, user: clientUser } = await createTestUser("CLIENT");
  const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId: slot.id });
  const bookingId = bookRes.body.booking.id as string;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });
  return { bookingId, clientToken, clientId: clientUser.id, therapistToken, therapistId: therapistUser.id };
}

async function consentTo(bookingId: string, clientToken: string) {
  return request(app).post(`/api/v1/bookings/${bookingId}/consent`).set("Authorization", `Bearer ${clientToken}`);
}

describe("POST /api/v1/bookings/:id/session/join-token", () => {
  it("issues a token for the client within the join window with valid consent", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000); // starts in 5 min, window is 10 min
    await consentTo(bookingId, clientToken);

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.roomToken).toBeTypeOf("string");
    expect(res.body.channel).toBe("VIDEO");
  });

  it("issues a token for the assigned therapist too, for the same session", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken, therapistToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${therapistToken}`).send({});

    expect(res.status).toBe(200);
    const sessions = await prisma.session.findMany({ where: { bookingId } });
    expect(sessions).toHaveLength(1); // both joins share the same session, not one each
  });

  it("rejects a non-owner client with 404 (never confirms the booking exists)", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    const { accessToken: strangerToken } = await createTestUser("CLIENT");

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${strangerToken}`).send({});
    expect(res.status).toBe(404);
  });

  it("rejects a different (non-assigned) therapist with 404, even though their role matches", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    const { accessToken: otherTherapistToken } = await createTestUser("THERAPIST");

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${otherTherapistToken}`).send({});
    expect(res.status).toBe(404);
  });

  it("rejects when the booking is not CONFIRMED yet (still PENDING_PAYMENT)", async () => {
    await seedConsentVersion();
    const { user: therapistUser } = await createTestUser("THERAPIST");
    await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
    const startTime = new Date(Date.now() + 5 * 60 * 1000);
    const slot = await prisma.availabilitySlot.create({
      data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
    });
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId: slot.id });
    // deliberately left as PENDING_PAYMENT — no consent possible/relevant yet either

    const res = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/session/join-token`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("rejects when consent has not been recorded at all", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000);
    // no consentTo() call

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    expect(res.status).toBe(403);
  });

  it("VERSION MISMATCH: rejects when consent was given for an older version than what's now current", async () => {
    await seedConsentVersion(1);
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);

    await seedConsentVersion(2); // a new version is published after the client consented

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    expect(res.status).toBe(403);

    // Re-consenting to the new version should unblock it.
    await consentTo(bookingId, clientToken);
    const retry = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    expect(retry.status).toBe(200);
  });

  it("rejects when it is too early to join (outside the pre-session window)", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(2 * 60 * 60 * 1000); // starts in 2h, window is 10 min
    await consentTo(bookingId, clientToken);

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    expect(res.status).toBe(403);
  });

  it("rejects when the session window has already passed", async () => {
    await seedConsentVersion();
    // Slot already ended 5 minutes ago.
    const { user: therapistUser } = await createTestUser("THERAPIST");
    await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
    const startTime = new Date(Date.now() - 65 * 60 * 1000);
    const endTime = new Date(Date.now() - 5 * 60 * 1000);
    const slot = await prisma.availabilitySlot.create({ data: { therapistId: therapistUser.id, startTime, endTime, isBooked: true } });
    const { accessToken: clientToken, user: clientUser } = await createTestUser("CLIENT");
    const booking = await prisma.booking.create({
      data: { clientId: clientUser.id, therapistId: therapistUser.id, slotId: slot.id, status: "CONFIRMED", expiresAt: new Date() },
    });
    await consentTo(booking.id, clientToken);

    const res = await request(app).post(`/api/v1/bookings/${booking.id}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    expect(res.status).toBe(403);
  });

  it("has no recording-related capability exported from the sessions module", () => {
    const exportNames = Object.keys(sessionsService);
    const suspicious = exportNames.filter((name) => /record/i.test(name));
    expect(suspicious).toEqual([]);
  });
});

describe("POST /api/v1/sessions/:id/complete", () => {
  it("marks the session COMPLETED and the booking COMPLETED when the therapist reports it as such", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken, therapistToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    const sessionRow = await prisma.session.findUniqueOrThrow({ where: { bookingId } });

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionRow.id}/complete`)
      .set("Authorization", `Bearer ${therapistToken}`)
      .send({ outcome: "COMPLETED" });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe("COMPLETED");
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("COMPLETED");
  });

  it("marks the booking NO_SHOW when reported as such", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken, therapistToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    const sessionRow = await prisma.session.findUniqueOrThrow({ where: { bookingId } });

    await request(app).post(`/api/v1/sessions/${sessionRow.id}/complete`).set("Authorization", `Bearer ${therapistToken}`).send({ outcome: "NO_SHOW" });

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("NO_SHOW");
  });

  it("rejects a client from completing a session (403)", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    const sessionRow = await prisma.session.findUniqueOrThrow({ where: { bookingId } });

    const res = await request(app).post(`/api/v1/sessions/${sessionRow.id}/complete`).set("Authorization", `Bearer ${clientToken}`).send({ outcome: "COMPLETED" });
    expect(res.status).toBe(403);
  });

  it("rejects a different therapist from completing someone else's session (404)", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    const sessionRow = await prisma.session.findUniqueOrThrow({ where: { bookingId } });

    const { user: otherTherapist } = await createTestUser("THERAPIST");
    const otherToken = signAccessToken({ sub: otherTherapist.id, role: "THERAPIST" });

    const res = await request(app).post(`/api/v1/sessions/${sessionRow.id}/complete`).set("Authorization", `Bearer ${otherToken}`).send({ outcome: "COMPLETED" });
    expect(res.status).toBe(404);
  });

  it("rejects completing an already-completed session (409)", async () => {
    await seedConsentVersion();
    const { bookingId, clientToken, therapistToken } = await createConfirmedBooking(5 * 60 * 1000);
    await consentTo(bookingId, clientToken);
    await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
    const sessionRow = await prisma.session.findUniqueOrThrow({ where: { bookingId } });
    await request(app).post(`/api/v1/sessions/${sessionRow.id}/complete`).set("Authorization", `Bearer ${therapistToken}`).send({ outcome: "COMPLETED" });

    const res = await request(app).post(`/api/v1/sessions/${sessionRow.id}/complete`).set("Authorization", `Bearer ${therapistToken}`).send({ outcome: "COMPLETED" });
    expect(res.status).toBe(409);
  });
});
