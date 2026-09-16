import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/db.js";

const app = createApp();

const validClient = {
  role: "CLIENT" as const,
  phone: "0712345678",
  password: "abcdefgh12",
  fullName: "Jane Client",
};

describe("POST /api/v1/auth/register", () => {
  beforeEach(async () => {
    await prisma.$transaction([prisma.otpCode.deleteMany(), prisma.user.deleteMany()]);
  });

  it("creates a client user and profile", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validClient);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeTypeOf("string");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.body.userId } });
    expect(user.role).toBe("CLIENT");
    expect(user.phone).toBe("+254712345678");
    expect(user.phoneVerified).toBe(false);

    const profile = await prisma.clientProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(profile.fullName).toBe("Jane Client");
  });

  it("creates a matching audit log entry", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validClient);
    const entry = await prisma.auditLogEntry.findFirstOrThrow({
      where: { resourceType: "User", resourceId: res.body.userId },
    });
    expect(entry.action).toBe("auth.register");
  });

  it("rejects a second registration with the same phone number (409)", async () => {
    await request(app).post("/api/v1/auth/register").send(validClient);
    const second = await request(app).post("/api/v1/auth/register").send(validClient);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });

  it("rejects a payload that fails shared schema validation (400)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validClient, phone: "not-a-phone" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects ADMIN as a self-registration role (not in REGISTERABLE_ROLES)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validClient, role: "ADMIN" });
    expect(res.status).toBe(400);
  });
});

describe("OTP verification and login", () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.refreshToken.deleteMany(),
      prisma.otpCode.deleteMany(),
      prisma.clientProfile.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  async function registerFreshOtp() {
    const res = await request(app).post("/api/v1/auth/register").send(validClient);
    const otp = await prisma.otpCode.findFirstOrThrow({
      where: { userId: res.body.userId },
      orderBy: { createdAt: "desc" },
    });
    return { userId: res.body.userId as string, otpId: otp.id };
  }

  it("rejects login before phone verification", async () => {
    await registerFreshOtp();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ phone: validClient.phone, password: validClient.password });
    expect(res.status).toBe(401);
  });

  it("rejects an incorrect OTP and increments attempt count", async () => {
    const { userId, otpId } = await registerFreshOtp();
    const res = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ phone: validClient.phone, code: "000000" });
    expect(res.status).toBe(401);

    const otp = await prisma.otpCode.findUniqueOrThrow({ where: { id: otpId } });
    expect(otp.attempts).toBe(1);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.phoneVerified).toBe(false);
  });

  it("locks out after OTP_MAX_ATTEMPTS incorrect attempts", async () => {
    await registerFreshOtp();
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/auth/verify-otp").send({ phone: validClient.phone, code: "000000" });
    }
    const res = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ phone: validClient.phone, code: "000000" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/too many/i);
  });

  it("full golden path: register -> verify real OTP -> login -> access /users/me", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send(validClient);
    const userId = registerRes.body.userId as string;

    // The API only ever persists the OTP hash (never the plaintext), so the test
    // overwrites the stored hash with one for a code it controls, to drive the real
    // verify-otp endpoint end to end without needing the SMS provider that isn't wired up yet.
    const { generateOtpCode, hashOtpCode } = await import("../../lib/otp.js");
    const code = generateOtpCode();
    await prisma.otpCode.updateMany({
      where: { userId },
      data: { codeHash: hashOtpCode(code), attempts: 0, consumedAt: null },
    });

    const verifyRes = await request(app).post("/api/v1/auth/verify-otp").send({ phone: validClient.phone, code });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ phone: validClient.phone, password: validClient.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.id).toBe(userId);
    expect(loginRes.body.tokens.accessToken).toBeTypeOf("string");
    expect(loginRes.body.tokens.refreshToken).toBeTypeOf("string");

    const meRes = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${loginRes.body.tokens.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(userId);
  });

  it("gives a generic 401 for a nonexistent phone (no user-enumeration signal)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ phone: "0799999999", password: "whatever123" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid phone number or password");
  });
});

describe("GET /api/v1/users/me authorization", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed/garbage bearer token", async () => {
    const res = await request(app).get("/api/v1/users/me").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });
});

describe("refresh token rotation and reuse detection", () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.refreshToken.deleteMany(),
      prisma.otpCode.deleteMany(),
      prisma.clientProfile.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  async function registerVerifyLogin() {
    const registerRes = await request(app).post("/api/v1/auth/register").send(validClient);
    const userId = registerRes.body.userId as string;

    const { generateOtpCode, hashOtpCode } = await import("../../lib/otp.js");
    const code = generateOtpCode();
    await prisma.otpCode.updateMany({ where: { userId }, data: { codeHash: hashOtpCode(code) } });
    await request(app).post("/api/v1/auth/verify-otp").send({ phone: validClient.phone, code });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ phone: validClient.phone, password: validClient.password });
    return loginRes.body.tokens as { accessToken: string; refreshToken: string };
  }

  it("issues a new token pair and revokes the old refresh token on use", async () => {
    const tokens = await registerVerifyLogin();

    const refreshRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: tokens.refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.tokens.refreshToken).not.toBe(tokens.refreshToken);

    // The old refresh token must no longer work.
    const reuseRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: tokens.refreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it("revokes ALL sessions for a user when a revoked refresh token is replayed", async () => {
    const tokens = await registerVerifyLogin();

    const firstRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: tokens.refreshToken });
    expect(firstRefresh.status).toBe(200);
    const rotatedToken = firstRefresh.body.tokens.refreshToken as string;

    // Replay the now-revoked original token — this should nuke every active session.
    const replay = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: tokens.refreshToken });
    expect(replay.status).toBe(401);

    // The token issued by the legitimate rotation should now also be dead.
    const rotatedShouldFail = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: rotatedToken });
    expect(rotatedShouldFail.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const tokens = await registerVerifyLogin();
    const logoutRes = await request(app).post("/api/v1/auth/logout").send({ refreshToken: tokens.refreshToken });
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: tokens.refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});
