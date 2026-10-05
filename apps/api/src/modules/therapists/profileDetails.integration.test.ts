import { describe, expect, it } from "vitest";
import request from "supertest";
import { MIN_RATINGS_TO_DISPLAY } from "@mind-hub/shared";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

async function createActiveTherapist() {
  const therapist = await createTestUser("THERAPIST", { fullName: "Rated Therapist" });
  await prisma.therapistProfile.update({
    where: { userId: therapist.user.id },
    data: { status: "ACTIVE", feeKES: 2000, verifiedAt: new Date("2026-09-01T00:00:00Z") },
  });
  return therapist;
}

async function addRatings(therapistId: string, ratings: number[]) {
  const { user: client } = await createTestUser("CLIENT");
  for (const [i, rating] of ratings.entries()) {
    const startTime = new Date(Date.now() - (i + 1) * 86_400_000);
    const slot = await prisma.availabilitySlot.create({
      data: { therapistId, startTime, endTime: new Date(startTime.getTime() + 3_600_000), isBooked: true },
    });
    const booking = await prisma.booking.create({
      data: { clientId: client.id, therapistId, slotId: slot.id, status: "COMPLETED", expiresAt: startTime },
    });
    await prisma.feedback.create({ data: { bookingId: booking.id, clientId: client.id, rating } });
  }
}

describe("public therapist ratings", () => {
  it(`stays hidden until there are ${MIN_RATINGS_TO_DISPLAY} ratings`, async () => {
    const therapist = await createActiveTherapist();
    await addRatings(therapist.user.id, Array(MIN_RATINGS_TO_DISPLAY - 1).fill(5));

    const res = await request(app).get(`/api/v1/therapists/${therapist.user.id}`);
    expect(res.body.therapist.rating).toBeNull();
  });

  it("shows the rounded average and count once there are enough", async () => {
    const therapist = await createActiveTherapist();
    await addRatings(therapist.user.id, [5, 5, 4, 4, 5]);

    const profile = await request(app).get(`/api/v1/therapists/${therapist.user.id}`);
    expect(profile.body.therapist.rating).toEqual({ average: 4.6, count: 5 });

    const directory = await request(app).get("/api/v1/therapists");
    expect(directory.body.therapists[0].rating).toEqual({ average: 4.6, count: 5 });
  });

  it("never exposes feedback comments", async () => {
    const therapist = await createActiveTherapist();
    await addRatings(therapist.user.id, [5, 5, 5, 5, 5]);
    await prisma.feedback.updateMany({ data: { comment: "very private comment" } });

    const res = await request(app).get(`/api/v1/therapists/${therapist.user.id}`);
    expect(JSON.stringify(res.body)).not.toContain("very private comment");
  });
});

describe("therapist profile details", () => {
  it("publishes photo, experience, registration number and verification date", async () => {
    const therapist = await createActiveTherapist();

    const update = await request(app)
      .patch("/api/v1/therapists/me/profile")
      .set("Authorization", `Bearer ${therapist.accessToken}`)
      .send({
        specialties: ["Grief and life transitions"],
        languages: ["English", "Kiswahili"],
        feeKES: 2500,
        photoUrl: "https://example.com/photo.jpg",
        yearsExperience: 8,
        registrationNumber: "KCPB/1234",
      });
    expect(update.status).toBe(200);

    const res = await request(app).get(`/api/v1/therapists/${therapist.user.id}`);
    expect(res.body.therapist).toMatchObject({
      photoUrl: "https://example.com/photo.jpg",
      yearsExperience: 8,
      registrationNumber: "KCPB/1234",
      verifiedAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("clears an optional detail when it's left out of the next update", async () => {
    const therapist = await createActiveTherapist();
    const auth = { Authorization: `Bearer ${therapist.accessToken}` };
    const base = { specialties: ["Parenting support"], languages: ["English"], feeKES: 2000 };

    await request(app).patch("/api/v1/therapists/me/profile").set(auth).send({ ...base, yearsExperience: 3 });
    await request(app).patch("/api/v1/therapists/me/profile").set(auth).send(base);

    const res = await request(app).get(`/api/v1/therapists/${therapist.user.id}`);
    expect(res.body.therapist.yearsExperience).toBeNull();
  });

  it("rejects a photo link that isn't a URL", async () => {
    const therapist = await createActiveTherapist();
    const res = await request(app)
      .patch("/api/v1/therapists/me/profile")
      .set("Authorization", `Bearer ${therapist.accessToken}`)
      .send({ specialties: ["Parenting support"], languages: ["English"], feeKES: 2000, photoUrl: "not a url" });
    expect(res.status).toBe(400);
  });
});
