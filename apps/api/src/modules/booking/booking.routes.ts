import { Router } from "express";
import { createBookingRequestSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./booking.controller.js";

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);

bookingRoutes.post("/", requireRole("CLIENT"), validateBody(createBookingRequestSchema), controller.create);

bookingRoutes.post(
  "/:id/cancel",
  requireRole("CLIENT", "THERAPIST"),
  validateParams(idParamSchema),
  controller.cancel,
);
