import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createCareRelationship, createTestUser } from "../../test/factories.js";

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("journal", () => {
  it("creates, edits and deletes the client's own entries", async () => {
    const { accessToken } = await createTestUser("CLIENT");

    const created = await request(app).post("/api/v1/journal").set(auth(accessToken)).send({ title: "Monday", body: "Felt tense", mood: 2 });
    expect(created.status).toBe(201);
    const id = created.body.entry.id;

    const updated = await request(app).put(`/api/v1/journal/${id}`).set(auth(accessToken)).send({ body: "Felt tense, then better" });
    expect(updated.body.entry).toMatchObject({ body: "Felt tense, then better", title: null, mood: null });

    expect((await request(app).delete(`/api/v1/journal/${id}`).set(auth(accessToken))).status).toBe(204);
    expect((await request(app).get("/api/v1/journal").set(auth(accessToken))).body.entries).toEqual([]);
  });

  it("returns 404 for another client's entry", async () => {
    const owner = await createTestUser("CLIENT");
    const other = await createTestUser("CLIENT");
    const created = await request(app).post("/api/v1/journal").set(auth(owner.accessToken)).send({ body: "mine" });

    const res = await request(app).put(`/api/v1/journal/${created.body.entry.id}`).set(auth(other.accessToken)).send({ body: "hijack" });
    expect(res.status).toBe(404);
  });

  it("only lets a client share with a therapist on their care team", async () => {
    const { client } = await createCareRelationship();
    const stranger = await createTestUser("THERAPIST");

    const res = await request(app)
      .post("/api/v1/journal")
      .set(auth(client.accessToken))
      .send({ body: "for a stranger", sharedWithTherapistId: stranger.user.id });
    expect(res.status).toBe(400);
  });
});

describe("what a therapist can see", () => {
  it("shows a therapist only what was shared with them specifically", async () => {
    const { client, therapist } = await createCareRelationship();
    const other = await createTestUser("THERAPIST");
    const slot = await prisma.availabilitySlot.create({
      data: { therapistId: other.user.id, startTime: new Date(Date.now() + 86_400_000), endTime: new Date(Date.now() + 90_000_000), isBooked: true },
    });
    await prisma.booking.create({
      data: { clientId: client.user.id, therapistId: other.user.id, slotId: slot.id, status: "CONFIRMED", expiresAt: new Date() },
    });
    const post = (body: object) => request(app).post("/api/v1/journal").set(auth(client.accessToken)).send(body);
    await post({ body: "private" });
    await post({ body: "for Brian", sharedWithTherapistId: therapist.user.id });
    await post({ body: "for the other therapist", sharedWithTherapistId: other.user.id });
    await request(app).post("/api/v1/goals").set(auth(client.accessToken)).send({ title: "Walk daily", sharedWithTherapistId: therapist.user.id });

    const res = await request(app).get(`/api/v1/clients/${client.user.id}/shared`).set(auth(therapist.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.shared.client.fullName).toBe("Amina Client");
    expect(res.body.shared.journalEntries.map((e: { body: string }) => e.body)).toEqual(["for Brian"]);
    expect(res.body.shared.goals.map((g: { title: string }) => g.title)).toEqual(["Walk daily"]);
  });

  it("returns 404 for someone who isn't the therapist's client", async () => {
    const { therapist } = await createCareRelationship();
    const stranger = await createTestUser("CLIENT");
    const res = await request(app).get(`/api/v1/clients/${stranger.user.id}/shared`).set(auth(therapist.accessToken));
    expect(res.status).toBe(404);
  });
});

describe("goals", () => {
  it("tracks progress, fills it when achieved, and keeps sharing unless changed", async () => {
    const { client, therapist } = await createCareRelationship();
    const created = await request(app)
      .post("/api/v1/goals")
      .set(auth(client.accessToken))
      .send({ title: "Sleep by 11pm", sharedWithTherapistId: therapist.user.id });
    const id = created.body.goal.id;

    const progressed = await request(app).patch(`/api/v1/goals/${id}`).set(auth(client.accessToken)).send({ progress: 40 });
    expect(progressed.body.goal).toMatchObject({ progress: 40, status: "ACTIVE", sharedWithTherapistId: therapist.user.id });

    const achieved = await request(app).patch(`/api/v1/goals/${id}`).set(auth(client.accessToken)).send({ status: "ACHIEVED" });
    expect(achieved.body.goal).toMatchObject({ progress: 100, status: "ACHIEVED" });

    const unshared = await request(app).patch(`/api/v1/goals/${id}`).set(auth(client.accessToken)).send({ sharedWithTherapistId: null });
    expect(unshared.body.goal.sharedWithTherapistId).toBeNull();
  });

  it("rejects an empty update", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const created = await request(app).post("/api/v1/goals").set(auth(accessToken)).send({ title: "x" });
    const res = await request(app).patch(`/api/v1/goals/${created.body.goal.id}`).set(auth(accessToken)).send({});
    expect(res.status).toBe(400);
  });
});

describe("worksheets", () => {
  it("moves from not started, to in progress, to completed", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const started = await request(app).post("/api/v1/worksheets/responses").set(auth(accessToken)).send({ worksheetSlug: "thought-record" });
    expect(started.body.worksheet.status).toBe("NOT_STARTED");
    const id = started.body.worksheet.id;

    const saved = await request(app)
      .patch(`/api/v1/worksheets/responses/${id}`)
      .set(auth(accessToken))
      .send({ answers: { situation: "Team meeting", intensityBefore: 8 } });
    expect(saved.body.worksheet.status).toBe("IN_PROGRESS");

    const completed = await request(app)
      .patch(`/api/v1/worksheets/responses/${id}`)
      .set(auth(accessToken))
      .send({ answers: { situation: "Team meeting", intensityBefore: 8, intensityAfter: 4 }, status: "COMPLETED" });
    expect(completed.body.worksheet.status).toBe("COMPLETED");
    expect(completed.body.worksheet.completedAt).not.toBeNull();
    expect(completed.body.worksheet.answers).toEqual({ situation: "Team meeting", intensityBefore: 8, intensityAfter: 4 });
  });

  it("rejects answers that don't fit the worksheet", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const started = await request(app).post("/api/v1/worksheets/responses").set(auth(accessToken)).send({ worksheetSlug: "sleep-diary" });

    const res = await request(app)
      .patch(`/api/v1/worksheets/responses/${started.body.worksheet.id}`)
      .set(auth(accessToken))
      .send({ answers: { rested: 42 } });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown worksheet", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const res = await request(app).post("/api/v1/worksheets/responses").set(auth(accessToken)).send({ worksheetSlug: "made-up" });
    expect(res.status).toBe(400);
  });

  it("lets a therapist assign a worksheet, shared back with them, and messages the client", async () => {
    const { client, therapist } = await createCareRelationship();

    const res = await request(app)
      .post("/api/v1/worksheets/assignments")
      .set(auth(therapist.accessToken))
      .send({ clientId: client.user.id, worksheetSlug: "three-good-things", note: "Try it three evenings this week." });
    expect(res.status).toBe(201);

    const mine = await request(app).get("/api/v1/worksheets/responses").set(auth(client.accessToken));
    expect(mine.body.worksheets[0]).toMatchObject({
      worksheetSlug: "three-good-things",
      assignedByName: "Brian Therapist",
      assignmentNote: "Try it three evenings this week.",
      sharedWithTherapistId: therapist.user.id,
    });

    const message = await prisma.message.findFirstOrThrow({ where: { clientId: client.user.id } });
    expect(message.senderId).toBe(therapist.user.id);
    expect(message.body).toContain("Three good things");
  });

  it("won't let a therapist assign to someone who isn't their client", async () => {
    const { therapist } = await createCareRelationship();
    const stranger = await createTestUser("CLIENT");
    const res = await request(app)
      .post("/api/v1/worksheets/assignments")
      .set(auth(therapist.accessToken))
      .send({ clientId: stranger.user.id, worksheetSlug: "three-good-things" });
    expect(res.status).toBe(404);
  });

  it("keeps therapists out of client toolkit endpoints", async () => {
    const { therapist } = await createCareRelationship();
    for (const path of ["/api/v1/journal", "/api/v1/goals", "/api/v1/worksheets/responses"]) {
      expect((await request(app).get(path).set(auth(therapist.accessToken))).status).toBe(403);
    }
  });
});
