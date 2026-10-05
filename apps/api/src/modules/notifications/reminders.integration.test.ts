import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../lib/db.js";
import { createTestUser } from "../../test/factories.js";
import { sendDueSessionReminders } from "./reminders.service.js";

vi.mock("../../lib/sms.js", () => ({ sendSms: vi.fn(), isSmsStubMode: () => true }));
const { sendSms } = await import("../../lib/sms.js");
const sendSmsMock = vi.mocked(sendSms);

const MINUTE = 60_000;

async function createConfirmedBooking(startsInMs: number) {
  const { user: client } = await createTestUser("CLIENT");
  const { user: therapist } = await createTestUser("THERAPIST");
  const startTime = new Date(Date.now() + startsInMs);
  const slot = await prisma.availabilitySlot.create({
    data: { therapistId: therapist.id, startTime, endTime: new Date(startTime.getTime() + 60 * MINUTE), isBooked: true },
  });
  const booking = await prisma.booking.create({
    data: { clientId: client.id, therapistId: therapist.id, slotId: slot.id, status: "CONFIRMED", expiresAt: new Date() },
  });
  return { booking, client, therapist };
}

beforeEach(() => {
  sendSmsMock.mockReset();
});

describe("sendDueSessionReminders", () => {
  it("sends the hour reminder to both client and therapist for a session starting within the hour", async () => {
    const { booking, client, therapist } = await createConfirmedBooking(30 * MINUTE);

    expect(await sendDueSessionReminders()).toBe(1);

    const recipients = sendSmsMock.mock.calls.map(([to]) => to).sort();
    expect(recipients).toEqual([client.phone, therapist.phone].sort());
    const updated = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.reminderHourSentAt).not.toBeNull();
    // The day window (1–24h) had already passed, so only one reminder goes out.
    expect(updated.reminderDaySentAt).toBeNull();
  });

  it("sends the day reminder for a session 1–24 hours away, and never twice", async () => {
    const { booking } = await createConfirmedBooking(5 * 60 * MINUTE);

    expect(await sendDueSessionReminders()).toBe(1);
    expect(await sendDueSessionReminders()).toBe(0);

    expect(sendSmsMock).toHaveBeenCalledTimes(2); // client + therapist, once
    const updated = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.reminderDaySentAt).not.toBeNull();
    expect(updated.reminderHourSentAt).toBeNull();
  });

  it("keeps reminder text free of the therapist's name and of clinical words", async () => {
    await createConfirmedBooking(30 * MINUTE);
    await prisma.therapistProfile.updateMany({ data: { fullName: "Dr Wanjiku Kamau" } });

    await sendDueSessionReminders();

    for (const [, message] of sendSmsMock.mock.calls) {
      expect(message).not.toMatch(/wanjiku|kamau|therap|counsel/i);
    }
  });

  it("ignores sessions more than 24 hours away and bookings that aren't confirmed", async () => {
    await createConfirmedBooking(30 * 60 * MINUTE);
    const { booking } = await createConfirmedBooking(30 * MINUTE);
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "PENDING_PAYMENT" } });

    expect(await sendDueSessionReminders()).toBe(0);
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it("skips anyone who has turned SMS notifications off", async () => {
    const { client, therapist } = await createConfirmedBooking(30 * MINUTE);
    await prisma.user.update({ where: { id: client.id }, data: { smsNotificationsEnabled: false } });

    await sendDueSessionReminders();

    expect(sendSmsMock.mock.calls.map(([to]) => to)).toEqual([therapist.phone]);
  });

  it("still marks the reminder sent when an SMS fails, so it isn't retried every minute", async () => {
    const { booking } = await createConfirmedBooking(30 * MINUTE);
    sendSmsMock.mockRejectedValue(new Error("provider down"));

    expect(await sendDueSessionReminders()).toBe(1);
    const updated = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.reminderHourSentAt).not.toBeNull();
  });
});
