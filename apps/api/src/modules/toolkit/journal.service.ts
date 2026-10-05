import type { JournalEntry } from "@prisma/client";
import type { JournalEntryRequest, JournalEntryResponse } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";
import { checkShareTarget } from "./sharing.js";

const LIST_LIMIT = 200;

export function toJournalEntryResponse(entry: JournalEntry): JournalEntryResponse {
  return {
    id: entry.id,
    title: entry.title,
    body: entry.body,
    mood: entry.mood,
    sharedWithTherapistId: entry.sharedWithTherapistId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

async function getOwnEntry(clientId: string, id: string): Promise<JournalEntry> {
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.clientId !== clientId) {
    throw new NotFoundError("Journal entry not found");
  }
  return entry;
}

export async function listOwnEntries(clientId: string): Promise<JournalEntryResponse[]> {
  const entries = await prisma.journalEntry.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
  return entries.map(toJournalEntryResponse);
}

export async function createEntry(clientId: string, input: JournalEntryRequest): Promise<JournalEntryResponse> {
  await checkShareTarget(clientId, input.sharedWithTherapistId);
  const entry = await prisma.journalEntry.create({
    data: {
      clientId,
      title: input.title || null,
      body: input.body,
      mood: input.mood ?? null,
      sharedWithTherapistId: input.sharedWithTherapistId ?? null,
    },
  });
  return toJournalEntryResponse(entry);
}

/** A full replacement: the request is the whole entry, so omitted fields are cleared. */
export async function updateEntry(clientId: string, id: string, input: JournalEntryRequest): Promise<JournalEntryResponse> {
  await getOwnEntry(clientId, id);
  await checkShareTarget(clientId, input.sharedWithTherapistId);
  const entry = await prisma.journalEntry.update({
    where: { id },
    data: {
      title: input.title || null,
      body: input.body,
      mood: input.mood ?? null,
      sharedWithTherapistId: input.sharedWithTherapistId ?? null,
    },
  });
  return toJournalEntryResponse(entry);
}

export async function deleteEntry(clientId: string, id: string): Promise<void> {
  await getOwnEntry(clientId, id);
  await prisma.journalEntry.delete({ where: { id } });
}
