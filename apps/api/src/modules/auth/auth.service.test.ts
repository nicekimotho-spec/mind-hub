import { describe, expect, it, vi } from "vitest";
import { calculateIsMinor } from "./auth.service.js";

describe("calculateIsMinor", () => {
  it("returns false when no date of birth is given", () => {
    expect(calculateIsMinor(undefined)).toBe(false);
  });

  it("returns true for someone who turns 18 tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    const dob = new Date("2008-06-16T00:00:00Z");
    expect(calculateIsMinor(dob)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false for someone who turned 18 yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    const dob = new Date("2008-06-14T00:00:00Z");
    expect(calculateIsMinor(dob)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false for someone who turns 18 exactly today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    const dob = new Date("2008-06-15T00:00:00Z");
    expect(calculateIsMinor(dob)).toBe(false);
    vi.useRealTimers();
  });

  it("returns true for a young child", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    const dob = new Date("2018-01-01T00:00:00Z");
    expect(calculateIsMinor(dob)).toBe(true);
    vi.useRealTimers();
  });
});
