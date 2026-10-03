import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";
import { releaseExpiredBookings } from "./booking.service.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

async function createActiveTherapistWithSlot(startOffsetMs = 2 * 60 * 60 * 1000) {
  const { user } = await createTestUser("THERAPIST");
  await prisma.therapistProfile.update({ where: { userId: user.id }, data: { status: "ACTIVE" } });
  const startTime = new Date(Date.now() + startOffsetMs);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: user.id, startTime, endTime },
  });
  return { therapistId: user.id, slotId: slot.id, startTime };
}

describe("POST /api/v1/therapists/me/slots", () => {
  it("lets an active therapist create a future availability slot", async () => {
    const { accessToken } = await createTestUser("THERAPIST");
    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const res = await request(app)
      .post("/api/v1/therapists/me/slots")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ startTime: startTime.toISOString(), endTime: endTime.toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.slot.startTime).toBe(startTime.toISOString());
  });

  it("rejects an overlapping slot for the same therapist", async () => {
    const { accessToken } = await createTestUser("THERAPIST");
    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    await request(app)
      .post("/api/v1/therapists/me/slots")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ startTime: startTime.toISOString(), endTime: endTime.toISOString() });

    const overlapStart = new Date(startTime.getTime() + 30 * 60 * 1000);
    const overlapEnd = new Date(overlapStart.getTime() + 60 * 60 * 1000);
    const res = await request(app)
      .post("/api/v1/therapists/me/slots")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ startTime: overlapStart.toISOString(), endTime: overlapEnd.toISOString() });

    expect(res.status).toBe(409);
  });
});

describe("GET /api/v1/therapists/:id/slots", () => {
  it("only lists unbooked future slots", async () => {
    const { therapistId, slotId } = await createActiveTherapistWithSlot();

    const before = await request(app).get(`/api/v1/therapists/${therapistId}/slots`);
    expect(before.body.slots).toHaveLength(1);

    await prisma.availabilitySlot.update({ where: { id: slotId }, data: { isBooked: true } });

    const after = await request(app).get(`/api/v1/therapists/${therapistId}/slots`);
    expect(after.body.slots).toHaveLength(0);
  });
});

describe("POST /api/v1/bookings", () => {
  it("creates a PENDING_PAYMENT booking and marks the slot booked", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken, user: client } = await createTestUser("CLIENT");

    const res = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });

    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("PENDING_PAYMENT");
    expect(res.body.booking.clientId).toBe(client.id);

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.isBooked).toBe(true);
  });

  it("rejects booking an already-booked slot (409)", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken: firstToken } = await createTestUser("CLIENT");
    const { accessToken: secondToken } = await createTestUser("CLIENT");

    const first = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${firstToken}`).send({ slotId });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${secondToken}`).send({ slotId });
    expect(second.status).toBe(409);
  });

  it("rejects booking a slot belonging to a non-ACTIVE therapist (409)", async () => {
    const { user } = await createTestUser("THERAPIST"); // left PENDING_VERIFICATION
    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const slot = await prisma.availabilitySlot.create({
      data: { therapistId: user.id, startTime, endTime: new Date(startTime.getTime() + 60 * 60 * 1000) },
    });
    const { accessToken } = await createTestUser("CLIENT");

    const res = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId: slot.id });
    expect(res.status).toBe(409);
  });

  it("rejects booking a nonexistent slot (404)", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const res = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ slotId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(404);
  });

  it("CONCURRENCY: exactly one of two simultaneous bookings for the same slot succeeds", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken: tokenA } = await createTestUser("CLIENT");
    const { accessToken: tokenB } = await createTestUser("CLIENT");

    const [resA, resB] = await Promise.all([
      request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${tokenA}`).send({ slotId }),
      request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${tokenB}`).send({ slotId }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const bookingsForSlot = await prisma.booking.findMany({ where: { slotId } });
    expect(bookingsForSlot).toHaveLength(1);

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.isBooked).toBe(true);
  });
});

describe("POST /api/v1/bookings/:id/cancel", () => {
  it("a client can always cancel a PENDING_PAYMENT booking, freeing the slot", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking.status).toBe("CANCELLED");

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.isBooked).toBe(false);
  });

  it("allows cancelling a CONFIRMED booking outside the cancellation window", async () => {
    const { slotId } = await createActiveTherapistWithSlot(48 * 60 * 60 * 1000); // 48h out
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });
    await prisma.booking.update({ where: { id: bookRes.body.booking.id }, data: { status: "CONFIRMED" } });

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(cancelRes.status).toBe(200);
  });

  it("rejects cancelling a CONFIRMED booking inside the cancellation window (403)", async () => {
    const { slotId } = await createActiveTherapistWithSlot(2 * 60 * 60 * 1000); // 2h out, window is 24h
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });
    await prisma.booking.update({ where: { id: bookRes.body.booking.id }, data: { status: "CONFIRMED" } });

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(cancelRes.status).toBe(403);

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.isBooked).toBe(true);
  });

  it("rejects cancelling an already-cancelled booking (409)", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });
    await request(app).post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`).set("Authorization", `Bearer ${accessToken}`);

    const secondCancel = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(secondCancel.status).toBe(409);
  });

  it("rejects a different client from cancelling someone else's booking (404)", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken: ownerToken } = await createTestUser("CLIENT");
    const { accessToken: otherToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${ownerToken}`).send({ slotId });

    const res = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });

  it("lets the assigned therapist cancel the booking too", async () => {
    const { slotId, therapistId } = await createActiveTherapistWithSlot();
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId });

    const therapistUser = await prisma.user.findUniqueOrThrow({ where: { id: therapistId } });
    const { signAccessToken } = await import("../../lib/jwt.js");
    const therapistToken = signAccessToken({ sub: therapistUser.id, role: therapistUser.role });

    const res = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${therapistToken}`);

    expect(res.status).toBe(200);
  });

  it("rejects a different (non-assigned) therapist from cancelling someone else's booking (404)", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId });

    const { accessToken: otherTherapistToken } = await createTestUser("THERAPIST");

    const res = await request(app)
      .post(`/api/v1/bookings/${bookRes.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${otherTherapistToken}`);

    expect(res.status).toBe(404);
  });
});

describe("releaseExpiredBookings", () => {
  it("cancels PENDING_PAYMENT bookings past their expiry and frees the slot", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });

    await prisma.booking.update({
      where: { id: bookRes.body.booking.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const releasedCount = await releaseExpiredBookings();
    expect(releasedCount).toBe(1);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookRes.body.booking.id } });
    expect(booking.status).toBe("CANCELLED");

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.isBooked).toBe(false);
  });

  it("does not touch a booking that has not yet expired", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });

    const releasedCount = await releaseExpiredBookings();
    expect(releasedCount).toBe(0);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookRes.body.booking.id } });
    expect(booking.status).toBe("PENDING_PAYMENT");
  });

  it("does not touch a CONFIRMED booking even if its original hold window has passed", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${accessToken}`).send({ slotId });
    await prisma.booking.update({
      where: { id: bookRes.body.booking.id },
      data: { status: "CONFIRMED", expiresAt: new Date(Date.now() - 1000) },
    });

    const releasedCount = await releaseExpiredBookings();
    expect(releasedCount).toBe(0);

    const slot = await prisma.availabilitySlot.findUniqueOrThrow({ where: { id: slotId } });
    expect(slot.isBooked).toBe(true);
  });
});

describe("GET /api/v1/bookings", () => {
  it("a client sees only their own bookings, hydrated with names and slot times", async () => {
    const { slotId, therapistId } = await createActiveTherapistWithSlot();
    const { accessToken: clientToken } = await createTestUser("CLIENT", { fullName: "Jane Client" });
    await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId });

    // A second, unrelated client/booking must not leak into the first client's list.
    const { slotId: otherSlotId } = await createActiveTherapistWithSlot();
    const { accessToken: otherClientToken } = await createTestUser("CLIENT");
    await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${otherClientToken}`).send({ slotId: otherSlotId });

    const res = await request(app).get("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.bookings[0].therapistId).toBe(therapistId);
    expect(res.body.bookings[0].clientName).toBe("Jane Client");
    expect(res.body.bookings[0].slot.id).toBe(slotId);
    expect(res.body.bookings[0].paymentStatus).toBeNull();
    expect(res.body.bookings[0].hasConsented).toBe(false);
  });

  it("a therapist sees bookings where they are the assigned therapist", async () => {
    const { slotId, therapistId } = await createActiveTherapistWithSlot();
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId });

    const therapistUser = await prisma.user.findUniqueOrThrow({ where: { id: therapistId } });
    const { signAccessToken } = await import("../../lib/jwt.js");
    const therapistToken = signAccessToken({ sub: therapistUser.id, role: "THERAPIST" });

    const res = await request(app).get("/api/v1/bookings").set("Authorization", `Bearer ${therapistToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
  });
});

describe("GET /api/v1/bookings/:id", () => {
  it("returns the hydrated detail for the owning client", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId });

    const res = await request(app).get(`/api/v1/bookings/${bookRes.body.booking.id}`).set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.id).toBe(bookRes.body.booking.id);
  });

  it("returns 404 for a booking that belongs to neither the caller's client nor therapist identity", async () => {
    const { slotId } = await createActiveTherapistWithSlot();
    const { accessToken: clientToken } = await createTestUser("CLIENT");
    const bookRes = await request(app).post("/api/v1/bookings").set("Authorization", `Bearer ${clientToken}`).send({ slotId });

    const { accessToken: strangerToken } = await createTestUser("CLIENT");
    const res = await request(app).get(`/api/v1/bookings/${bookRes.body.booking.id}`).set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(404);
  });
});
