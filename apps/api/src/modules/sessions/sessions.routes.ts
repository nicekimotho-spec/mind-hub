import { Router } from "express";
import { completeSessionRequestSchema, sendMessageRequestSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./sessions.controller.js";

export const sessionsRoutes = Router();

sessionsRoutes.post(
  "/:id/complete",
  authenticate,
  requireRole("THERAPIST"),
  validateParams(idParamSchema),
  validateBody(completeSessionRequestSchema),
  controller.complete,
);

sessionsRoutes.get("/:id/messages", authenticate, requireRole("CLIENT", "THERAPIST"), validateParams(idParamSchema), controller.getChat);
sessionsRoutes.post(
  "/:id/messages",
  authenticate,
  requireRole("CLIENT", "THERAPIST"),
  validateParams(idParamSchema),
  validateBody(sendMessageRequestSchema),
  controller.sendChat,
);
