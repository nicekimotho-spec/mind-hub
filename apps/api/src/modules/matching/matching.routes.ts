import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateParams } from "../../middleware/validate.js";
import * as controller from "./matching.controller.js";

export const matchingRoutes = Router();

const intakeIdParamSchema = z.object({ intakeId: z.string().uuid() });

matchingRoutes.post(
  "/:intakeId",
  authenticate,
  requireRole("CLIENT"),
  validateParams(intakeIdParamSchema),
  controller.createMatch,
);
