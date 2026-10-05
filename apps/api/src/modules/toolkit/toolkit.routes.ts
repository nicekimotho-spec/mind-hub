import { Router } from "express";
import { z } from "zod";
import {
  assignWorksheetRequestSchema,
  createGoalRequestSchema,
  journalEntryRequestSchema,
  startWorksheetRequestSchema,
  updateGoalRequestSchema,
  updateWorksheetRequestSchema,
} from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./toolkit.controller.js";

export const journalRoutes = Router();
journalRoutes.use(authenticate, requireRole("CLIENT"));
journalRoutes.get("/", controller.listJournal);
journalRoutes.post("/", validateBody(journalEntryRequestSchema), controller.createJournalEntry);
journalRoutes.put("/:id", validateParams(idParamSchema), validateBody(journalEntryRequestSchema), controller.updateJournalEntry);
journalRoutes.delete("/:id", validateParams(idParamSchema), controller.deleteJournalEntry);

export const goalsRoutes = Router();
goalsRoutes.use(authenticate, requireRole("CLIENT"));
goalsRoutes.get("/", controller.listGoals);
goalsRoutes.post("/", validateBody(createGoalRequestSchema), controller.createGoal);
goalsRoutes.patch("/:id", validateParams(idParamSchema), validateBody(updateGoalRequestSchema), controller.updateGoal);
goalsRoutes.delete("/:id", validateParams(idParamSchema), controller.deleteGoal);

export const worksheetsRoutes = Router();
worksheetsRoutes.use(authenticate);
worksheetsRoutes.get("/responses", requireRole("CLIENT"), controller.listWorksheets);
worksheetsRoutes.post("/responses", requireRole("CLIENT"), validateBody(startWorksheetRequestSchema), controller.startWorksheet);
worksheetsRoutes.get("/responses/:id", requireRole("CLIENT"), validateParams(idParamSchema), controller.getWorksheet);
worksheetsRoutes.patch(
  "/responses/:id",
  requireRole("CLIENT"),
  validateParams(idParamSchema),
  validateBody(updateWorksheetRequestSchema),
  controller.updateWorksheet,
);
worksheetsRoutes.delete("/responses/:id", requireRole("CLIENT"), validateParams(idParamSchema), controller.deleteWorksheet);
worksheetsRoutes.post("/assignments", requireRole("THERAPIST"), validateBody(assignWorksheetRequestSchema), controller.assignWorksheet);

export const clientsRoutes = Router();
clientsRoutes.get(
  "/:clientId/shared",
  authenticate,
  requireRole("THERAPIST"),
  validateParams(z.object({ clientId: z.string().uuid() })),
  controller.getShared,
);
