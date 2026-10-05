import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { createTestUser } from "../../test/factories.js";

const app = createApp();

describe("/api/v1/users/me/preferences", () => {
  it("defaults SMS notifications on, and lets the user turn them off", async () => {
    const { accessToken } = await createTestUser("CLIENT");

    const before = await request(app).get("/api/v1/users/me/preferences").set("Authorization", `Bearer ${accessToken}`);
    expect(before.status).toBe(200);
    expect(before.body.preferences).toEqual({ smsNotificationsEnabled: true });

    const update = await request(app)
      .patch("/api/v1/users/me/preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ smsNotificationsEnabled: false });
    expect(update.status).toBe(200);

    const after = await request(app).get("/api/v1/users/me/preferences").set("Authorization", `Bearer ${accessToken}`);
    expect(after.body.preferences).toEqual({ smsNotificationsEnabled: false });
  });

  it("rejects a malformed body", async () => {
    const { accessToken } = await createTestUser("CLIENT");
    const res = await request(app)
      .patch("/api/v1/users/me/preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ smsNotificationsEnabled: "yes" });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/me/preferences");
    expect(res.status).toBe(401);
  });
});
