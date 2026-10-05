import type { MessageResponse, MessageThread, MessageThreadSummary } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { sendSms } from "../../lib/sms.js";
import { logger } from "../../lib/logger.js";
import { containsRiskLanguage } from "../../lib/riskLanguage.js";
import { env } from "../../config/env.js";
import { assertCareRelationship, listCareTeam, pairFor } from "../careTeam/careTeam.service.js";

const THREAD_MESSAGE_LIMIT = 200;

export function toMessageResponse(message: {
  id: string;
  senderId: string;
  body: string;
  riskFlagged: boolean;
  sessionId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): MessageResponse {
  return {
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    riskFlagged: message.riskFlagged,
    sessionId: message.sessionId,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

/** One entry per person the caller has a care relationship with — including people
 * they haven't messaged yet, so a client can start the first conversation. */
export async function listThreads(userId: string, role: string): Promise<MessageThreadSummary[]> {
  const members = await listCareTeam(userId, role);
  if (members.length === 0) return [];

  const isTherapist = role === "THERAPIST";
  const ownSide = isTherapist ? { therapistId: userId } : { clientId: userId };
  const counterpartField = isTherapist ? "clientId" : "therapistId";

  const [latest, unread] = await Promise.all([
    prisma.message.findMany({
      where: ownSide,
      orderBy: { createdAt: "desc" },
      distinct: [counterpartField],
      select: { clientId: true, therapistId: true, senderId: true, createdAt: true },
    }),
    prisma.message.groupBy({
      by: [counterpartField],
      where: { ...ownSide, senderId: { not: userId }, readAt: null },
      _count: { _all: true },
    }),
  ]);
  const latestByCounterpart = new Map(latest.map((m) => [m[counterpartField], m]));
  const unreadByCounterpart = new Map(unread.map((row) => [row[counterpartField], row._count._all]));

  return members
    .map((member) => {
      const last = latestByCounterpart.get(member.id);
      return {
        counterpartId: member.id,
        counterpartName: member.fullName,
        lastMessage: last ? { senderId: last.senderId, createdAt: last.createdAt.toISOString() } : null,
        unreadCount: unreadByCounterpart.get(member.id) ?? 0,
      };
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""));
}

/** Returns the most recent messages oldest-first, and marks the counterpart's messages
 * read — opening the conversation is what "read" means here. */
export async function getThread(userId: string, role: string, counterpartId: string): Promise<MessageThread> {
  const pair = pairFor(userId, role, counterpartId);
  await assertCareRelationship(pair.clientId, pair.therapistId);

  const counterpartProfile =
    role === "THERAPIST"
      ? await prisma.clientProfile.findUnique({ where: { userId: counterpartId }, select: { fullName: true } })
      : await prisma.therapistProfile.findUnique({ where: { userId: counterpartId }, select: { fullName: true } });

  const recent = await prisma.message.findMany({
    where: pair,
    orderBy: { createdAt: "desc" },
    take: THREAD_MESSAGE_LIMIT,
  });

  await prisma.message.updateMany({
    where: { ...pair, senderId: counterpartId, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    counterpart: { id: counterpartId, fullName: counterpartProfile?.fullName ?? "Unknown" },
    messages: recent.reverse().map(toMessageResponse),
  };
}

/**
 * Texts the recipient only when this is the first unread message from the sender, so a
 * burst of messages produces one SMS rather than one per message. As with reminders, the
 * text says nothing about who the message is from or what it says.
 */
async function notifyRecipient(recipientId: string, senderId: string, pair: { clientId: string; therapistId: string }) {
  const unreadFromSender = await prisma.message.count({ where: { ...pair, senderId, readAt: null } });
  if (unreadFromSender !== 1) return;

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { phone: true, status: true, smsNotificationsEnabled: true },
  });
  if (!recipient || recipient.status !== "ACTIVE" || !recipient.smsNotificationsEnabled) return;

  try {
    await sendSms(recipient.phone, `Mind Hub: you have a new message. Read it here: ${env.WEB_ORIGIN}/messages`);
  } catch (err) {
    logger.error({ err, recipientId }, "Failed to send new-message SMS");
  }
}

export async function sendMessage(userId: string, role: string, counterpartId: string, body: string) {
  const pair = pairFor(userId, role, counterpartId);
  await assertCareRelationship(pair.clientId, pair.therapistId);

  const riskFlagged = role === "CLIENT" && containsRiskLanguage(body);
  const message = await prisma.message.create({
    data: { ...pair, senderId: userId, body, riskFlagged },
  });

  await notifyRecipient(counterpartId, userId, pair);

  return { message: toMessageResponse(message), showCrisisResources: riskFlagged };
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.message.count({
    where: { OR: [{ clientId: userId }, { therapistId: userId }], senderId: { not: userId }, readAt: null },
  });
}
