import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.feedback.deleteMany(),
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

/** Drives a booking all the way to COMPLETED via the real endpoints (booking, consent,
 * join, complete) rather than writing the status directly, so this test also doubles
 * as an end-to-end smoke test of the whole chain feedback depends on. */
async function createCompletedBooking() {
  await prisma.consentVersion.create({ data: { version: 1, content: "v1", effectiveAt: new Date() } });

  const { user: therapistUser, accessToken: therapistToken } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
  const startTime = new Date(Date.now() + 5 * 60 * 1000);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
  });
  const { accessToken: clientToken } = await createTestUser("CLIENT");
  const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId: slot.id });
  const bookingId = bookRes.body.booking.id as string;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });

  await request(app).post(`/api/v1/bookings/${bookingId}/consent`).set("Authorization", `Bearer ${clientToken}`);
  await request(app).post(`/api/v1/bookings/${bookingId}/session/join-token`).set("Authorization", `Bearer ${clientToken}`).send({});
  const session = await prisma.session.findUniqueOrThrow({ where: { bookingId } });
  await request(app).post(`/api/v1/sessions/${session.id}/complete`).set("Authorization", `Bearer ${therapistToken}`).send({ outcome: "COMPLETED" });

  return { bookingId, clientToken };
}

describe("POST /api/v1/bookings/:id/feedback", () => {
  it("lets the client submit feedback on a completed booking", async () => {
    const { bookingId, clientToken } = await createCompletedBooking();

    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/feedback`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ rating: 5, comment: "Really helpful session." });

    expect(res.status).toBe(201);
    expect(res.body.feedback.rating).toBe(5);
  });

  it("rejects feedback on a booking that isn't COMPLETED yet", async () => {
    const { user: therapistUser } = await createTestUser("THERAPIST");
    await prisma.therapistProfile.update({ where: { userId: therapistUser.id }, data: { status: "ACTIVE" } });
    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const slot = await prisma.availabilitySlot.create({
      data: { therapistId: therapistUser.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
    });
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId: slot.id });

    const res = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/feedback`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ rating: 4 });
    expect(res.status).toBe(409);
  });

  it("rejects a second feedback submission for the same booking (409)", async () => {
    const { bookingId, clientToken } = await createCompletedBooking();
    await request(app).post(`/api/v1/bookings/${bookingId}/feedback`).set("Authorization", `Bearer ${clientToken}`).send({ rating: 5 });

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/feedback`).set("Authorization", `Bearer ${clientToken}`).send({ rating: 1 });
    expect(res.status).toBe(409);
  });

  it("rejects feedback from someone who isn't the booking's client (404)", async () => {
    const { bookingId } = await createCompletedBooking();
    const { accessToken: strangerToken } = await createTestUser("CLIENT");

    const res = await request(app).post(`/api/v1/bookings/${bookingId}/feedback`).set("Authorization", `Bearer ${strangerToken}`).send({ rating: 5 });
    expect(res.status).toBe(404);
  });

  it("rejects an out-of-range rating (400)", async () => {
    const { bookingId, clientToken } = await createCompletedBooking();
    const res = await request(app).post(`/api/v1/bookings/${bookingId}/feedback`).set("Authorization", `Bearer ${clientToken}`).send({ rating: 7 });
    expect(res.status).toBe(400);
  });
});
