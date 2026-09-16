import { Router } from "express";
import { intakeRequestSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./intake.controller.js";

export const intakeRoutes = Router();

intakeRoutes.use(authenticate, requireRole("CLIENT"));

intakeRoutes.post("/", validateBody(intakeRequestSchema), controller.create);

intakeRoutes.get("/:id", validateParams(idParamSchema), controller.getById);
