import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createCareRelationship, createTestUser } from "../../test/factories.js";

vi.mock("../../lib/sms.js", () => ({ sendSms: vi.fn(), isSmsStubMode: () => true }));
const { sendSms } = await import("../../lib/sms.js");
const sendSmsMock = vi.mocked(sendSms);

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeEach(() => {
  sendSmsMock.mockReset();
});

describe("messaging between a client and their therapist", () => {
  it("lets either side send, and the other side read, a message", async () => {
    const { client, therapist } = await createCareRelationship();

    const sent = await request(app)
      .post(`/api/v1/messages/threads/${therapist.user.id}`)
      .set(auth(client.accessToken))
      .send({ body: "Hi, could we talk about sleep next time?" });
    expect(sent.status).toBe(201);
    expect(sent.body.showCrisisResources).toBe(false);

    const thread = await request(app).get(`/api/v1/messages/threads/${client.user.id}`).set(auth(therapist.accessToken));
    expect(thread.status).toBe(200);
    expect(thread.body.thread.counterpart.fullName).toBe("Amina Client");
    expect(thread.body.thread.messages.map((m: { body: string }) => m.body)).toEqual(["Hi, could we talk about sleep next time?"]);
  });

  it("marks messages read when the recipient opens the thread, and counts unread until then", async () => {
    const { client, therapist } = await createCareRelationship();
    await request(app).post(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken)).send({ body: "one" });
    await request(app).post(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken)).send({ body: "two" });

    const before = await request(app).get("/api/v1/messages/unread-count").set(auth(therapist.accessToken));
    expect(before.body.count).toBe(2);
    // The sender's own messages never count as unread for them.
    const senderCount = await request(app).get("/api/v1/messages/unread-count").set(auth(client.accessToken));
    expect(senderCount.body.count).toBe(0);

    await request(app).get(`/api/v1/messages/threads/${client.user.id}`).set(auth(therapist.accessToken));

    const after = await request(app).get("/api/v1/messages/unread-count").set(auth(therapist.accessToken));
    expect(after.body.count).toBe(0);
  });

  it("lists threads for everyone on the care team, including people not yet messaged", async () => {
    const { client, therapist } = await createCareRelationship();

    const res = await request(app).get("/api/v1/messages/threads").set(auth(client.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.threads).toEqual([
      { counterpartId: therapist.user.id, counterpartName: "Brian Therapist", lastMessage: null, unreadCount: 0 },
    ]);
  });

  it("texts the recipient once for a burst of messages, without revealing content", async () => {
    const { client, therapist } = await createCareRelationship();
    for (const body of ["a", "b", "c"]) {
      await request(app).post(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken)).send({ body });
    }

    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    const [to, text] = sendSmsMock.mock.calls[0] ?? [];
    expect(to).toBe(therapist.user.phone);
    expect(text).not.toMatch(/Amina|therap|counsel/i);
  });

  it("flags crisis language from a client and tells the UI to show emergency numbers", async () => {
    const { client, therapist } = await createCareRelationship();

    const res = await request(app)
      .post(`/api/v1/messages/threads/${therapist.user.id}`)
      .set(auth(client.accessToken))
      .send({ body: "I don't see the point anymore, I want to end it all" });

    expect(res.body.showCrisisResources).toBe(true);
    expect(res.body.message.riskFlagged).toBe(true);
  });

  it("returns 404 between a client and a therapist who have no paid booking together", async () => {
    const { client } = await createCareRelationship({ status: "PENDING_PAYMENT" });
    const stranger = await createTestUser("THERAPIST");
    const { therapist: unpaidTherapist } = await createCareRelationship({ status: "PENDING_PAYMENT" });

    for (const therapistId of [stranger.user.id, unpaidTherapist.user.id]) {
      const res = await request(app).post(`/api/v1/messages/threads/${therapistId}`).set(auth(client.accessToken)).send({ body: "hello" });
      expect(res.status).toBe(404);
    }
    expect(await prisma.message.count()).toBe(0);
  });

  it("rejects an empty message", async () => {
    const { client, therapist } = await createCareRelationship();
    const res = await request(app).post(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken)).send({ body: "   " });
    expect(res.status).toBe(400);
  });

  it("audit-logs a polled thread view once per sitting, not on every poll", async () => {
    const { client, therapist } = await createCareRelationship();
    for (let i = 0; i < 3; i += 1) {
      await request(app).get(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken));
    }
    expect(await prisma.auditLogEntry.count({ where: { action: "message.thread_view", actorId: client.user.id } })).toBe(1);
  });

  it("keeps message text out of the polled inbox list", async () => {
    const { client, therapist } = await createCareRelationship();
    await request(app).post(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken)).send({ body: "private words" });

    const res = await request(app).get("/api/v1/messages/threads").set(auth(therapist.accessToken));
    expect(JSON.stringify(res.body)).not.toContain("private words");
    expect(res.body.threads[0].unreadCount).toBe(1);
  });

  it("writes an audit entry for each message sent", async () => {
    const { client, therapist } = await createCareRelationship();
    const res = await request(app).post(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken)).send({ body: "hi" });

    const entry = await prisma.auditLogEntry.findFirst({ where: { action: "message.send", resourceId: res.body.message.id } });
    expect(entry?.actorId).toBe(client.user.id);
  });
});

describe("GET /api/v1/care-team", () => {
  it("lists a client's therapists and a therapist's clients", async () => {
    const { client, therapist } = await createCareRelationship({ status: "COMPLETED" });

    const forClient = await request(app).get("/api/v1/care-team").set(auth(client.accessToken));
    expect(forClient.body.members).toEqual([{ id: therapist.user.id, fullName: "Brian Therapist" }]);

    const forTherapist = await request(app).get("/api/v1/care-team").set(auth(therapist.accessToken));
    expect(forTherapist.body.members).toEqual([{ id: client.user.id, fullName: "Amina Client" }]);
  });
});
