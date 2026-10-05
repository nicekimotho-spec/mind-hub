import { afterEach, describe, expect, it, vi } from "vitest";
import { isSmsStubMode, sendSms } from "./sms.js";

describe("sendSms (stub mode — no AT_* credentials configured in test env)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is in stub mode without credentials", () => {
    expect(isSmsStubMode()).toBe(true);
  });

  it("resolves without making a network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendSms("+254712345678", "hello")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
