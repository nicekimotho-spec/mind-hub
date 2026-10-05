import { describe, expect, it } from "vitest";
import { describeSessionTime } from "./reminders.service.js";

// 2026-10-05 09:00 in Nairobi (UTC+3, no DST) is 06:00 UTC.
const now = new Date("2026-10-05T06:00:00Z");

describe("describeSessionTime", () => {
  it("says 'today' for a later time on the same Nairobi calendar day", () => {
    expect(describeSessionTime(new Date("2026-10-05T12:00:00Z"), now)).toMatch(/^today at 3:00\s?pm$/i);
  });

  it("says 'tomorrow' for the next Nairobi calendar day", () => {
    expect(describeSessionTime(new Date("2026-10-06T06:30:00Z"), now)).toMatch(/^tomorrow at 9:30\s?am$/i);
  });

  it("uses the Nairobi day, not UTC — 22:30 UTC on the 5th is already the 6th in Nairobi", () => {
    expect(describeSessionTime(new Date("2026-10-05T22:30:00Z"), now)).toMatch(/^tomorrow at 1:30\s?am$/i);
  });

  it("names the weekday and date further out", () => {
    expect(describeSessionTime(new Date("2026-10-08T12:00:00Z"), now)).toMatch(/^Thu.*8 Oct.* at 3:00\s?pm$/i);
  });
});
