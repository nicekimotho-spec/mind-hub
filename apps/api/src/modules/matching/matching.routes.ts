import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { switchTherapistRequestSchema } from "@mind-hub/shared";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./matching.controller.js";

export const matchingRoutes = Router();

const intakeIdParamSchema = z.object({ intakeId: z.string().uuid() });

// Registered before "/:intakeId", which would otherwise match "switch" as an intake id.
matchingRoutes.post("/switch", authenticate, requireRole("CLIENT"), validateBody(switchTherapistRequestSchema), controller.switchTherapist);

matchingRoutes.post(
  "/:intakeId",
  authenticate,
  requireRole("CLIENT"),
  validateParams(intakeIdParamSchema),
  controller.createMatch,
);
