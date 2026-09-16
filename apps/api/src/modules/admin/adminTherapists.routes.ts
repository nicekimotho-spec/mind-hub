import { Router } from "express";
import { rejectOrSuspendRequestSchema } from "@mind-hub/shared";
import { idParamSchema, therapistStatusQuerySchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./adminTherapists.controller.js";

export const adminTherapistsRoutes = Router();

adminTherapistsRoutes.use(authenticate, requireRole("ADMIN"));

adminTherapistsRoutes.get("/", validateQuery(therapistStatusQuerySchema), controller.list);

adminTherapistsRoutes.post("/:id/verify", validateParams(idParamSchema), controller.verify);

adminTherapistsRoutes.post(
  "/:id/reject",
  validateParams(idParamSchema),
  validateBody(rejectOrSuspendRequestSchema),
  controller.reject,
);

adminTherapistsRoutes.post(
  "/:id/suspend",
  validateParams(idParamSchema),
  validateBody(rejectOrSuspendRequestSchema),
  controller.suspend,
);
