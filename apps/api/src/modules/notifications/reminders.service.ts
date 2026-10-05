import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/db.js";
import { sendSms } from "../../lib/sms.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

const HOUR_MS = 60 * 60 * 1000;

/**
 * The two reminders cover non-overlapping windows before a session starts: the "day"
 * reminder for sessions 1–24 hours away, the "hour" reminder for sessions less than an
 * hour away. A booking confirmed 30 minutes before its session therefore gets one
 * reminder, not two at once.
 */
const REMINDER_KINDS: Array<{
  name: string;
  windowStartMs: number;
  windowEndMs: number;
  unsent: Prisma.BookingWhereInput;
  markSent: (at: Date) => Prisma.BookingUpdateManyMutationInput;
}> = [
  {
    name: "day",
    windowStartMs: HOUR_MS,
    windowEndMs: 24 * HOUR_MS,
    unsent: { reminderDaySentAt: null },
    markSent: (at) => ({ reminderDaySentAt: at }),
  },
  {
    name: "hour",
    windowStartMs: 0,
    windowEndMs: HOUR_MS,
    unsent: { reminderHourSentAt: null },
    markSent: (at) => ({ reminderHourSentAt: at }),
  },
];

function dateKey(date: Date): string {
  // en-CA formats as YYYY-MM-DD, which compares cleanly as a calendar-day key.
  return new Intl.DateTimeFormat("en-CA", { timeZone: env.DISPLAY_TIMEZONE }).format(date);
}

/** "today at 3:00 pm", "tomorrow at 9:30 am", or "Wed, 8 Oct at 3:00 pm". */
export function describeSessionTime(start: Date, now: Date): string {
  const time = new Intl.DateTimeFormat("en-KE", { timeZone: env.DISPLAY_TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(start);
  const startDay = dateKey(start);
  if (startDay === dateKey(now)) return `today at ${time}`;
  if (startDay === dateKey(new Date(now.getTime() + 24 * HOUR_MS))) return `tomorrow at ${time}`;
  const day = new Intl.DateTimeFormat("en-KE", { timeZone: env.DISPLAY_TIMEZONE, weekday: "short", day: "numeric", month: "short" }).format(start);
  return `${day} at ${time}`;
}

/**
 * Reminder text is deliberately discreet — no therapist name, and no words like
 * "therapy" or "counselling" — because an SMS can be read by anyone holding the phone.
 */
async function notifyParticipants(booking: { id: string; clientId: string; therapistId: string; slot: { startTime: Date } }, now: Date) {
  const when = describeSessionTime(booking.slot.startTime, now);
  const link = `${env.WEB_ORIGIN}/bookings/${booking.id}`;
  const recipients = await prisma.user.findMany({
    where: { id: { in: [booking.clientId, booking.therapistId] }, status: "ACTIVE", smsNotificationsEnabled: true },
    select: { id: true, phone: true },
  });

  for (const recipient of recipients) {
    const message =
      recipient.id === booking.clientId
        ? `Mind Hub reminder: you have an appointment ${when}. Join here: ${link}`
        : `Mind Hub reminder: you have a client session ${when}. Details: ${link}`;
    try {
      await sendSms(recipient.phone, message);
    } catch (err) {
      logger.error({ err, bookingId: booking.id, userId: recipient.id }, "Failed to send session reminder SMS");
    }
  }
}

/**
 * Sends every reminder that's due and returns how many bookings were reminded. Each
 * reminder is claimed with a guarded updateMany (the same pattern as slot booking in
 * booking.service.ts) before the SMS goes out, so two overlapping job ticks can never
 * both send the same reminder. The trade-off is at-most-once delivery: a send that
 * fails is logged rather than retried, which is preferable to texting someone twice.
 */
export async function sendDueSessionReminders(now = new Date()): Promise<number> {
  let reminded = 0;

  for (const kind of REMINDER_KINDS) {
    const due = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        ...kind.unsent,
        slot: {
          startTime: { gt: new Date(now.getTime() + kind.windowStartMs), lte: new Date(now.getTime() + kind.windowEndMs) },
        },
      },
      select: { id: true, clientId: true, therapistId: true, slot: { select: { startTime: true } } },
    });

    for (const booking of due) {
      const claimed = await prisma.booking.updateMany({
        where: { id: booking.id, ...kind.unsent },
        data: kind.markSent(now),
      });
      if (claimed.count === 0) continue;
      await notifyParticipants(booking, now);
      reminded += 1;
    }

    if (due.length > 0) {
      logger.info({ kind: kind.name, count: due.length }, "Sent session reminders");
    }
  }

  return reminded;
}
