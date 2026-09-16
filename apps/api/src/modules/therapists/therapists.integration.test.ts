import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";
import { hashPassword } from "../../lib/password.js";
import { signAccessToken } from "../../lib/jwt.js";

const app = createApp();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLogEntry.deleteMany(),
    prisma.therapistCredential.deleteMany(),
    prisma.therapistProfile.deleteMany(),
    prisma.clientProfile.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

async function createUser(role: "CLIENT" | "THERAPIST" | "ADMIN", overrides: { phone: string }) {
  const passwordHash = await hashPassword("irrelevant-password-1");
  const user = await prisma.user.create({
    data: {
      phone: overrides.phone,
      passwordHash,
      role,
      phoneVerified: true,
      ...(role === "CLIENT"
        ? { clientProfile: { create: { fullName: "Test Client" } } }
        : role === "THERAPIST"
          ? {
              therapistProfile: {
                create: { fullName: "Test Therapist", feeKES: 0, specialties: [], languages: [] },
              },
            }
          : {}),
    },
  });
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return { user, accessToken };
}

const validProfileUpdate = {
  bio: "Experienced counsellor focused on anxiety and stress.",
  specialties: ["Stress and anxiety", "Grief and life transitions"],
  languages: ["en", "sw"],
  feeKES: 2500,
};

describe("PATCH /api/v1/therapists/me/profile", () => {
  it("lets a therapist update their own profile", async () => {
    const { accessToken, user } = await createUser("THERAPIST", { phone: "+254711111111" });

    const res = await request(app)
      .patch("/api/v1/therapists/me/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validProfileUpdate);

    expect(res.status).toBe(200);
    expect(res.body.profile.specialties).toEqual(validProfileUpdate.specialties);
    expect(res.body.profile.feeKES).toBe(2500);

    const entry = await prisma.auditLogEntry.findFirstOrThrow({
      where: { resourceType: "TherapistProfile", resourceId: user.id },
    });
    expect(entry.action).toBe("therapist.update_profile");
  });

  it("rejects a client trying to update a therapist profile (403)", async () => {
    const { accessToken } = await createUser("CLIENT", { phone: "+254722222222" });

    const res = await request(app)
      .patch("/api/v1/therapists/me/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(validProfileUpdate);

    expect(res.status).toBe(403);
  });

  it("rejects an invalid payload (empty specialties) before touching the DB", async () => {
    const { accessToken } = await createUser("THERAPIST", { phone: "+254733333333" });

    const res = await request(app)
      .patch("/api/v1/therapists/me/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...validProfileUpdate, specialties: [] });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/therapists/me/credentials", () => {
  it("lets a therapist add a credential", async () => {
    const { accessToken, user } = await createUser("THERAPIST", { phone: "+254744444444" });

    const res = await request(app)
      .post("/api/v1/therapists/me/credentials")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "PROFESSIONAL_LICENSE", documentUrl: "https://storage.example.com/license.pdf" });

    expect(res.status).toBe(201);
    expect(res.body.credential.therapistId).toBe(user.id);
    expect(res.body.credential.verified).toBe(false);
  });
});

describe("GET /api/v1/therapists (public directory)", () => {
  it("only lists ACTIVE therapists, never PENDING_VERIFICATION ones", async () => {
    const { user: pendingTherapist } = await createUser("THERAPIST", { phone: "+254755555555" });
    await prisma.therapistProfile.update({
      where: { userId: pendingTherapist.id },
      data: validProfileUpdate,
    });

    const listRes = await request(app).get("/api/v1/therapists");
    expect(listRes.status).toBe(200);
    expect(listRes.body.therapists).toHaveLength(0);

    await prisma.therapistProfile.update({
      where: { userId: pendingTherapist.id },
      data: { status: "ACTIVE" },
    });

    const listResAfter = await request(app).get("/api/v1/therapists");
    expect(listResAfter.body.therapists).toHaveLength(1);
    expect(listResAfter.body.therapists[0].userId).toBe(pendingTherapist.id);
  });

  it("filters by specialty", async () => {
    const { user: t1 } = await createUser("THERAPIST", { phone: "+254766666666" });
    const { user: t2 } = await createUser("THERAPIST", { phone: "+254777777777" });
    await prisma.therapistProfile.update({
      where: { userId: t1.id },
      data: { ...validProfileUpdate, specialties: ["Grief and life transitions"], status: "ACTIVE" },
    });
    await prisma.therapistProfile.update({
      where: { userId: t2.id },
      data: { ...validProfileUpdate, specialties: ["Workplace wellbeing"], status: "ACTIVE" },
    });

    const res = await request(app).get("/api/v1/therapists").query({ specialty: "Workplace wellbeing" });
    expect(res.body.therapists).toHaveLength(1);
    expect(res.body.therapists[0].userId).toBe(t2.id);
  });

  it("returns 404 (not the profile) for a non-ACTIVE therapist looked up by id directly", async () => {
    const { user: pendingTherapist } = await createUser("THERAPIST", { phone: "+254788888888" });

    const res = await request(app).get(`/api/v1/therapists/${pendingTherapist.id}`);
    expect(res.status).toBe(404);
  });
});

describe("Admin therapist verification workflow", () => {
  it("rejects a non-admin from listing the admin review queue (403)", async () => {
    const { accessToken } = await createUser("THERAPIST", { phone: "+254799999999" });
    const res = await request(app).get("/api/v1/admin/therapists").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("lists therapists filtered by status for an admin", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254700111222" });
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254700333444" });

    const res = await request(app)
      .get("/api/v1/admin/therapists")
      .query({ status: "PENDING_VERIFICATION" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.therapists.map((t: { userId: string }) => t.userId)).toContain(therapist.id);
  });

  it("verify transitions PENDING_VERIFICATION -> ACTIVE and writes an audit log entry", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254700555666" });
    const { accessToken: adminToken, user: admin } = await createUser("ADMIN", { phone: "+254700777888" });

    const res = await request(app)
      .post(`/api/v1/admin/therapists/${therapist.id}/verify`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.status).toBe("ACTIVE");
    expect(res.body.profile.verifiedById).toBe(admin.id);

    const entry = await prisma.auditLogEntry.findFirstOrThrow({
      where: { resourceType: "TherapistProfile", resourceId: therapist.id, action: "admin.therapist.verify" },
    });
    expect(entry.actorId).toBe(admin.id);
  });

  it("rejects verifying a therapist that is not PENDING_VERIFICATION (409)", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254700999000" });
    await prisma.therapistProfile.update({ where: { userId: therapist.id }, data: { status: "ACTIVE" } });
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254701111222" });

    const res = await request(app)
      .post(`/api/v1/admin/therapists/${therapist.id}/verify`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  it("reject transitions PENDING_VERIFICATION -> REJECTED and records the reason in the audit log", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254701333444" });
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254701555666" });

    const res = await request(app)
      .post(`/api/v1/admin/therapists/${therapist.id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Could not verify submitted license" });

    expect(res.status).toBe(200);
    expect(res.body.profile.status).toBe("REJECTED");

    const entry = await prisma.auditLogEntry.findFirstOrThrow({
      where: { resourceType: "TherapistProfile", resourceId: therapist.id, action: "admin.therapist.reject" },
    });
    expect((entry.metadata as { reason: string }).reason).toBe("Could not verify submitted license");
  });

  it("rejects a reject request with too short a reason (400)", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254701777888" });
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254701999000" });

    const res = await request(app)
      .post(`/api/v1/admin/therapists/${therapist.id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "no" });

    expect(res.status).toBe(400);
  });

  it("suspend transitions ACTIVE -> SUSPENDED and removes the therapist from the public directory", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254702111222" });
    await prisma.therapistProfile.update({
      where: { userId: therapist.id },
      data: { ...validProfileUpdate, status: "ACTIVE" },
    });
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254702333444" });

    const beforeList = await request(app).get("/api/v1/therapists");
    expect(beforeList.body.therapists).toHaveLength(1);

    const res = await request(app)
      .post(`/api/v1/admin/therapists/${therapist.id}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Multiple client complaints pending investigation" });

    expect(res.status).toBe(200);
    expect(res.body.profile.status).toBe("SUSPENDED");

    const afterList = await request(app).get("/api/v1/therapists");
    expect(afterList.body.therapists).toHaveLength(0);
  });

  it("rejects suspending a therapist who is still PENDING_VERIFICATION (409)", async () => {
    const { user: therapist } = await createUser("THERAPIST", { phone: "+254702555666" });
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254702777888" });

    const res = await request(app)
      .post(`/api/v1/admin/therapists/${therapist.id}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Not applicable yet" });

    expect(res.status).toBe(409);
  });

  it("rejects an admin action with a malformed (non-uuid) id param", async () => {
    const { accessToken: adminToken } = await createUser("ADMIN", { phone: "+254702999000" });

    const res = await request(app)
      .post("/api/v1/admin/therapists/not-a-uuid/verify")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
