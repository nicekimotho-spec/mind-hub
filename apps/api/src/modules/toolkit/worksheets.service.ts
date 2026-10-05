import type { WorksheetResponse } from "@prisma/client";
import {
  getWorksheet,
  validateWorksheetAnswers,
  type AssignWorksheetRequest,
  type UpdateWorksheetRequest,
  type WorksheetAnswers,
  type WorksheetResponseRecord,
} from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { assertCareRelationship } from "../careTeam/careTeam.service.js";
import { sendMessage } from "../messages/messages.service.js";
import { checkShareTarget } from "./sharing.js";

async function therapistNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];
  if (unique.length === 0) return new Map();
  const profiles = await prisma.therapistProfile.findMany({ where: { userId: { in: unique } }, select: { userId: true, fullName: true } });
  return new Map(profiles.map((p) => [p.userId, p.fullName]));
}

/** The public shape of each record, with the assigning therapist's name filled in. */
export async function toWorksheetResponses(records: WorksheetResponse[]): Promise<WorksheetResponseRecord[]> {
  const names = await therapistNames(records.map((r) => r.assignedById));
  return records.map((r) => ({
    id: r.id,
    worksheetSlug: r.worksheetSlug,
    assignedById: r.assignedById,
    assignedByName: r.assignedById ? (names.get(r.assignedById) ?? null) : null,
    assignmentNote: r.assignmentNote,
    status: r.status,
    answers: r.answers as WorksheetAnswers,
    sharedWithTherapistId: r.sharedWithTherapistId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

async function toOne(record: WorksheetResponse): Promise<WorksheetResponseRecord> {
  const [response] = await toWorksheetResponses([record]);
  return response as WorksheetResponseRecord;
}

async function getOwnRecord(clientId: string, id: string): Promise<WorksheetResponse> {
  const record = await prisma.worksheetResponse.findUnique({ where: { id } });
  if (!record || record.clientId !== clientId) {
    throw new NotFoundError("Worksheet not found");
  }
  return record;
}

export async function listOwn(clientId: string): Promise<WorksheetResponseRecord[]> {
  const records = await prisma.worksheetResponse.findMany({ where: { clientId }, orderBy: { updatedAt: "desc" } });
  return toWorksheetResponses(records);
}

export async function getOwn(clientId: string, id: string): Promise<WorksheetResponseRecord> {
  return toOne(await getOwnRecord(clientId, id));
}

export async function start(clientId: string, worksheetSlug: string): Promise<WorksheetResponseRecord> {
  const record = await prisma.worksheetResponse.create({ data: { clientId, worksheetSlug } });
  return toOne(record);
}

/**
 * Answers are replaced as a whole map (the form always sends every answer). Saving any
 * answer moves a NOT_STARTED worksheet to IN_PROGRESS; COMPLETED stamps completedAt the
 * first time and stays completed if the client edits afterwards.
 */
export async function update(clientId: string, id: string, input: UpdateWorksheetRequest): Promise<WorksheetResponseRecord> {
  const record = await getOwnRecord(clientId, id);
  await checkShareTarget(clientId, input.sharedWithTherapistId);

  if (input.answers) {
    const error = validateWorksheetAnswers(record.worksheetSlug, input.answers);
    if (error) {
      throw new ValidationError({ formErrors: [error], fieldErrors: {} });
    }
  }

  const status =
    input.status === "COMPLETED" || record.status === "COMPLETED"
      ? "COMPLETED"
      : input.status ?? (input.answers ? "IN_PROGRESS" : record.status);

  const updated = await prisma.worksheetResponse.update({
    where: { id },
    data: {
      answers: input.answers,
      status,
      completedAt: status === "COMPLETED" ? (record.completedAt ?? new Date()) : null,
      sharedWithTherapistId: input.sharedWithTherapistId,
    },
  });
  return toOne(updated);
}

export async function remove(clientId: string, id: string): Promise<void> {
  await getOwnRecord(clientId, id);
  await prisma.worksheetResponse.delete({ where: { id } });
}

/**
 * A therapist adds a worksheet to one of their clients' toolkits. It's shared back with
 * that therapist by default (the client can change that), and the therapist sends the
 * client a message about it, which also triggers the usual discreet SMS alert.
 */
export async function assign(therapistId: string, input: AssignWorksheetRequest): Promise<WorksheetResponseRecord> {
  await assertCareRelationship(input.clientId, therapistId);
  const worksheet = getWorksheet(input.worksheetSlug);
  if (!worksheet) {
    throw new NotFoundError("Worksheet not found");
  }

  const record = await prisma.worksheetResponse.create({
    data: {
      clientId: input.clientId,
      worksheetSlug: input.worksheetSlug,
      assignedById: therapistId,
      assignmentNote: input.note || null,
      sharedWithTherapistId: therapistId,
    },
  });

  const note = input.note ? `\n\n${input.note}` : "";
  await sendMessage(therapistId, "THERAPIST", input.clientId, `I've added the "${worksheet.title}" worksheet to your toolkit.${note}`);

  return toOne(record);
}
