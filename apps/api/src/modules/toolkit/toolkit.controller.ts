import type { RequestHandler } from "express";
import type {
  AssignWorksheetRequest,
  CreateGoalRequest,
  JournalEntryRequest,
  StartWorksheetRequest,
  UpdateGoalRequest,
  UpdateWorksheetRequest,
} from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAccessAuditLog, recordAuditLog } from "../../lib/auditLog.js";
import * as journalService from "./journal.service.js";
import * as goalsService from "./goals.service.js";
import * as worksheetsService from "./worksheets.service.js";
import { getSharedWithTherapist } from "./shared.service.js";

function requireUser(req: Parameters<RequestHandler>[0]) {
  if (!req.user) throw new AuthError("Not authenticated");
  return req.user;
}

// --- Journal ---

export const listJournal: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.status(200).json({ entries: await journalService.listOwnEntries(user.id) });
  } catch (err) {
    next(err);
  }
};

export const createJournalEntry: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const entry = await journalService.createEntry(user.id, req.body as JournalEntryRequest);
    await recordAuditLog({ actorId: user.id, action: "journal.create", resourceType: "JournalEntry", resourceId: entry.id });
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
};

export const updateJournalEntry: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const entry = await journalService.updateEntry(user.id, req.params["id"] as string, req.body as JournalEntryRequest);
    await recordAuditLog({ actorId: user.id, action: "journal.update", resourceType: "JournalEntry", resourceId: entry.id });
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
};

export const deleteJournalEntry: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params["id"] as string;
    await journalService.deleteEntry(user.id, id);
    await recordAuditLog({ actorId: user.id, action: "journal.delete", resourceType: "JournalEntry", resourceId: id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// --- Goals ---

export const listGoals: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.status(200).json({ goals: await goalsService.listOwnGoals(user.id) });
  } catch (err) {
    next(err);
  }
};

export const createGoal: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const goal = await goalsService.createGoal(user.id, req.body as CreateGoalRequest);
    await recordAuditLog({ actorId: user.id, action: "goal.create", resourceType: "Goal", resourceId: goal.id });
    res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
};

export const updateGoal: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const goal = await goalsService.updateGoal(user.id, req.params["id"] as string, req.body as UpdateGoalRequest);
    await recordAuditLog({ actorId: user.id, action: "goal.update", resourceType: "Goal", resourceId: goal.id });
    res.status(200).json({ goal });
  } catch (err) {
    next(err);
  }
};

export const deleteGoal: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params["id"] as string;
    await goalsService.deleteGoal(user.id, id);
    await recordAuditLog({ actorId: user.id, action: "goal.delete", resourceType: "Goal", resourceId: id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// --- Worksheets ---

export const listWorksheets: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.status(200).json({ worksheets: await worksheetsService.listOwn(user.id) });
  } catch (err) {
    next(err);
  }
};

export const getWorksheet: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    res.status(200).json({ worksheet: await worksheetsService.getOwn(user.id, req.params["id"] as string) });
  } catch (err) {
    next(err);
  }
};

export const startWorksheet: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const { worksheetSlug } = req.body as StartWorksheetRequest;
    const worksheet = await worksheetsService.start(user.id, worksheetSlug);
    await recordAuditLog({ actorId: user.id, action: "worksheet.start", resourceType: "WorksheetResponse", resourceId: worksheet.id });
    res.status(201).json({ worksheet });
  } catch (err) {
    next(err);
  }
};

export const updateWorksheet: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const worksheet = await worksheetsService.update(user.id, req.params["id"] as string, req.body as UpdateWorksheetRequest);
    await recordAuditLog({
      actorId: user.id,
      action: "worksheet.update",
      resourceType: "WorksheetResponse",
      resourceId: worksheet.id,
      metadata: { status: worksheet.status },
    });
    res.status(200).json({ worksheet });
  } catch (err) {
    next(err);
  }
};

export const deleteWorksheet: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const id = req.params["id"] as string;
    await worksheetsService.remove(user.id, id);
    await recordAuditLog({ actorId: user.id, action: "worksheet.delete", resourceType: "WorksheetResponse", resourceId: id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const assignWorksheet: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const input = req.body as AssignWorksheetRequest;
    const worksheet = await worksheetsService.assign(user.id, input);
    await recordAuditLog({
      actorId: user.id,
      action: "worksheet.assign",
      resourceType: "WorksheetResponse",
      resourceId: worksheet.id,
      metadata: { clientId: input.clientId, worksheetSlug: input.worksheetSlug },
    });
    res.status(201).json({ worksheet });
  } catch (err) {
    next(err);
  }
};

// --- Therapist view of what a client shared ---

export const getShared: RequestHandler = async (req, res, next) => {
  try {
    const user = requireUser(req);
    const clientId = req.params["clientId"] as string;
    const shared = await getSharedWithTherapist(user.id, clientId);
    await recordAccessAuditLog({ actorId: user.id, action: "toolkit.shared_view", resourceType: "Client", resourceId: clientId });
    res.status(200).json({ shared });
  } catch (err) {
    next(err);
  }
};
