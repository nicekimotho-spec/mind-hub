import { Router } from "express";
import { z } from "zod";
import { FEE_ASSISTANCE_STATUSES, applyForFeeAssistanceRequestSchema, decideFeeAssistanceRequestSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./feeAssistance.controller.js";

export const feeAssistanceRoutes = Router();
feeAssistanceRoutes.use(authenticate, requireRole("CLIENT"));
feeAssistanceRoutes.get("/me", controller.getMine);
feeAssistanceRoutes.post("/", validateBody(applyForFeeAssistanceRequestSchema), controller.apply);

export const adminFeeAssistanceRoutes = Router();
adminFeeAssistanceRoutes.use(authenticate, requireRole("ADMIN"));
adminFeeAssistanceRoutes.get("/", validateQuery(z.object({ status: z.enum(FEE_ASSISTANCE_STATUSES).optional() })), controller.listForAdmin);
adminFeeAssistanceRoutes.post("/:id/decision", validateParams(idParamSchema), validateBody(decideFeeAssistanceRequestSchema), controller.decide);
