import { Router } from "express";
import { createBookingRequestSchema, createFeedbackRequestSchema, joinSessionRequestSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./booking.controller.js";

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);

bookingRoutes.get("/", requireRole("CLIENT", "THERAPIST"), controller.listMine);
bookingRoutes.get("/:id", requireRole("CLIENT", "THERAPIST"), validateParams(idParamSchema), controller.getMine);

bookingRoutes.post("/", requireRole("CLIENT"), validateBody(createBookingRequestSchema), controller.create);

bookingRoutes.post(
  "/:id/cancel",
  requireRole("CLIENT", "THERAPIST"),
  validateParams(idParamSchema),
  controller.cancel,
);

bookingRoutes.post(
  "/:id/consent",
  requireRole("CLIENT"),
  validateParams(idParamSchema),
  controller.consent,
);

bookingRoutes.post(
  "/:id/session/join-token",
  requireRole("CLIENT", "THERAPIST"),
  validateParams(idParamSchema),
  validateBody(joinSessionRequestSchema),
  controller.joinToken,
);

bookingRoutes.post(
  "/:id/feedback",
  requireRole("CLIENT"),
  validateParams(idParamSchema),
  validateBody(createFeedbackRequestSchema),
  controller.feedback,
);
