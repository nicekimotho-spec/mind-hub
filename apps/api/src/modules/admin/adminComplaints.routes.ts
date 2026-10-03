import { Router } from "express";
import { updateComplaintRequestSchema } from "@mind-hub/shared";
import { complaintStatusQuerySchema, idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./adminComplaints.controller.js";

export const adminComplaintsRoutes = Router();

adminComplaintsRoutes.use(authenticate, requireRole("ADMIN"));

adminComplaintsRoutes.get("/", validateQuery(complaintStatusQuerySchema), controller.list);
adminComplaintsRoutes.get("/:id", validateParams(idParamSchema), controller.getById);
adminComplaintsRoutes.patch("/:id", validateParams(idParamSchema), validateBody(updateComplaintRequestSchema), controller.update);
