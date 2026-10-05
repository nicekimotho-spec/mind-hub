import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createCareRelationship, createTestUser } from "../../test/factories.js";

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** A consented booking starting in 5 minutes (inside the 10-minute join window), joined as a text chat. */
async function startChatSession(channel: "CHAT" | "VIDEO" = "CHAT") {
  await prisma.consentVersion.upsert({ where: { version: 1 }, update: {}, create: { version: 1, content: "v1", effectiveAt: new Date() } });
  const relationship = await createCareRelationship({ startsInMs: 5 * 60 * 1000 });
  const { client, booking } = relationship;
  await request(app).post(`/api/v1/bookings/${booking.id}/consent`).set(auth(client.accessToken));
  const joined = await request(app).post(`/api/v1/bookings/${booking.id}/session/join-token`).set(auth(client.accessToken)).send({ channel });
  return { ...relationship, sessionId: joined.body.sessionId as string, joined };
}

describe("live text-chat sessions", () => {
  it("joins as a chat, and both participants can send and read", async () => {
    const { client, therapist, sessionId, joined, booking } = await startChatSession();
    expect(joined.body.channel).toBe("CHAT");

    await request(app).post(`/api/v1/sessions/${sessionId}/messages`).set(auth(therapist.accessToken)).send({ body: "Hi Amina, how are you today?" });
    const sent = await request(app).post(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken)).send({ body: "Okay, a bit tired" });
    expect(sent.status).toBe(201);

    const chat = await request(app).get(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken));
    expect(chat.body.canSend).toBe(true);
    expect(chat.body.messages.map((m: { body: string }) => m.body)).toEqual(["Hi Amina, how are you today?", "Okay, a bit tired"]);

    const detail = await request(app).get(`/api/v1/bookings/${booking.id}`).set(auth(client.accessToken));
    expect(detail.body.booking.sessionChannel).toBe("CHAT");
  });

  it("keeps the transcript in the client–therapist conversation, without leaving unread badges", async () => {
    const { client, therapist, sessionId } = await startChatSession();
    await request(app).post(`/api/v1/sessions/${sessionId}/messages`).set(auth(therapist.accessToken)).send({ body: "Welcome" });
    await request(app).get(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken));

    const unread = await request(app).get("/api/v1/messages/unread-count").set(auth(client.accessToken));
    expect(unread.body.count).toBe(0);

    const thread = await request(app).get(`/api/v1/messages/threads/${therapist.user.id}`).set(auth(client.accessToken));
    expect(thread.body.thread.messages[0]).toMatchObject({ body: "Welcome", sessionId });
  });

  it("closes for sending once the session is completed, but stays readable", async () => {
    const { client, therapist, sessionId } = await startChatSession();
    await request(app).post(`/api/v1/sessions/${sessionId}/complete`).set(auth(therapist.accessToken)).send({ outcome: "COMPLETED" });

    const send = await request(app).post(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken)).send({ body: "One more thing" });
    expect(send.status).toBe(403);

    const chat = await request(app).get(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken));
    expect(chat.status).toBe(200);
    expect(chat.body.canSend).toBe(false);
  });

  it("flags crisis language from the client", async () => {
    const { client, sessionId } = await startChatSession();
    const res = await request(app).post(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken)).send({ body: "I've thought about suicide" });
    expect(res.body.showCrisisResources).toBe(true);
  });

  it("refuses chat on a video session", async () => {
    const { client, sessionId } = await startChatSession("VIDEO");
    const res = await request(app).get(`/api/v1/sessions/${sessionId}/messages`).set(auth(client.accessToken));
    expect(res.status).toBe(409);
  });

  it("returns 404 to anyone outside the session", async () => {
    const { sessionId } = await startChatSession();
    const outsider = await createTestUser("CLIENT");
    const res = await request(app).get(`/api/v1/sessions/${sessionId}/messages`).set(auth(outsider.accessToken));
    expect(res.status).toBe(404);
  });
});
