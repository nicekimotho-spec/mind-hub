import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([prisma.auditLogEntry.deleteMany(), prisma.complaint.deleteMany(), prisma.user.deleteMany()]);
});

describe("POST /api/v1/complaints", () => {
  it("lets any authenticated user file a complaint", async () => {
    const { accessToken, user } = await createTestUser("CLIENT");
    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ description: "My therapist was 20 minutes late without notice." });

    expect(res.status).toBe(201);
    expect(res.body.complaint.status).toBe("OPEN");
    expect(res.body.complaint.userId).toBe(user.id);
  });

  it("rejects a description that's too short (400)", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const res = await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${accessToken}`).send({ description: "bad" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/complaints (own)", () => {
  it("only lists the caller's own complaints", async () => {
    const { accessToken: userAToken } = await createTestUser("CLIENT");
    const { accessToken: userBToken } = await createTestUser("CLIENT");
    await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${userAToken}`).send({ description: "Complaint from user A here." });
    await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${userBToken}`).send({ description: "Complaint from user B here." });

    const res = await request(app).get("/api/v1/complaints").set("Authorization", `Bearer ${userAToken}`);
    expect(res.body.complaints).toHaveLength(1);
  });

  it("returns 404 (not the complaint) when fetching another user's complaint by id", async () => {
    const { accessToken: ownerToken } = await createTestUser("CLIENT");
    const { accessToken: otherToken } = await createTestUser("CLIENT");
    const createRes = await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${ownerToken}`).send({ description: "Owner's complaint text." });

    const res = await request(app).get(`/api/v1/complaints/${createRes.body.complaint.id}`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

describe("Admin complaints review", () => {
  it("rejects a non-admin from listing all complaints (403)", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const res = await request(app).get("/api/v1/admin/complaints").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("lets an admin list and filter complaints by status", async () => {
    const { accessToken: userToken } = await createTestUser("CLIENT");
    await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${userToken}`).send({ description: "Something went wrong here." });
    const { accessToken: adminToken } = await createTestUser("ADMIN");

    const res = await request(app).get("/api/v1/admin/complaints").query({ status: "OPEN" }).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.complaints.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects marking a complaint RESOLVED without a resolution note (400)", async () => {
    const { accessToken: userToken } = await createTestUser("CLIENT");
    const createRes = await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${userToken}`).send({ description: "Something went wrong here." });
    const { accessToken: adminToken } = await createTestUser("ADMIN");

    const res = await request(app)
      .patch(`/api/v1/admin/complaints/${createRes.body.complaint.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "RESOLVED" });
    expect(res.status).toBe(400);
  });

  it("lets an admin resolve a complaint with a resolution note, and it's captured in the audit log", async () => {
    const { accessToken: userToken } = await createTestUser("CLIENT");
    const createRes = await request(app).post("/api/v1/complaints").set("Authorization", `Bearer ${userToken}`).send({ description: "Something went wrong here." });
    const { accessToken: adminToken, user: admin } = await createTestUser("ADMIN");

    const res = await request(app)
      .patch(`/api/v1/admin/complaints/${createRes.body.complaint.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "RESOLVED", resolution: "Refunded the client and coached the therapist on punctuality." });

    expect(res.status).toBe(200);
    expect(res.body.complaint.status).toBe("RESOLVED");

    const entry = await prisma.auditLogEntry.findFirstOrThrow({
      where: { resourceType: "Complaint", resourceId: createRes.body.complaint.id, action: "admin.complaint.update" },
    });
    expect(entry.actorId).toBe(admin.id);
  });
});
