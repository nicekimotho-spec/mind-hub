import type { SharedWithTherapist } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { assertCareRelationship } from "../careTeam/careTeam.service.js";
import { toJournalEntryResponse } from "./journal.service.js";
import { toGoalResponse } from "./goals.service.js";
import { toWorksheetResponses } from "./worksheets.service.js";

/** Only items the client shared with this specific therapist — never anything shared
 * with someone else on their care team, and never anything kept private. */
export async function getSharedWithTherapist(therapistId: string, clientId: string): Promise<SharedWithTherapist> {
  await assertCareRelationship(clientId, therapistId);
  const sharedHere = { clientId, sharedWithTherapistId: therapistId };

  const [client, journalEntries, goals, worksheets] = await Promise.all([
    prisma.clientProfile.findUnique({ where: { userId: clientId }, select: { fullName: true } }),
    prisma.journalEntry.findMany({ where: sharedHere, orderBy: { createdAt: "desc" } }),
    prisma.goal.findMany({ where: sharedHere, orderBy: { createdAt: "desc" } }),
    prisma.worksheetResponse.findMany({ where: sharedHere, orderBy: { updatedAt: "desc" } }),
  ]);

  return {
    client: { id: clientId, fullName: client?.fullName ?? "Unknown" },
    journalEntries: journalEntries.map(toJournalEntryResponse),
    goals: goals.map(toGoalResponse),
    worksheets: await toWorksheetResponses(worksheets),
  };
}
