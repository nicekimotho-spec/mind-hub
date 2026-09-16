import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("access tokens", () => {
  it("round-trips sub and role through sign/verify", () => {
    const token = signAccessToken({ sub: "user-123", role: "CLIENT" });
    const payload = verifyAccessToken(token);
    expect(payload).toEqual({ sub: "user-123", role: "CLIENT" });
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ sub: "user-123", role: "CLIENT" });
    const tampered = `${token.slice(0, -1)}${token.at(-1) === "a" ? "b" : "a"}`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => verifyAccessToken("not-a-jwt")).toThrow();
  });
});
