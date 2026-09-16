import { Router } from "express";
import { addCredentialRequestSchema, createSlotRequestSchema, therapistDirectoryQuerySchema, updateTherapistProfileSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import * as controller from "./therapists.controller.js";

export const therapistsRoutes = Router();

// Public directory — only ever surfaces ACTIVE therapists (enforced in the service).
therapistsRoutes.get("/", validateQuery(therapistDirectoryQuerySchema), controller.listPublic);
therapistsRoutes.get("/:id", validateParams(idParamSchema), controller.getPublicById);
therapistsRoutes.get("/:id/slots", validateParams(idParamSchema), controller.listSlots);

// Own-profile management — therapist role only, scoped to req.user.id in the service.
therapistsRoutes.get("/me/profile", authenticate, requireRole("THERAPIST"), controller.getMyProfile);

therapistsRoutes.patch(
  "/me/profile",
  authenticate,
  requireRole("THERAPIST"),
  validateBody(updateTherapistProfileSchema),
  controller.updateMyProfile,
);

therapistsRoutes.post(
  "/me/credentials",
  authenticate,
  requireRole("THERAPIST"),
  validateBody(addCredentialRequestSchema),
  controller.addMyCredential,
);

therapistsRoutes.post(
  "/me/slots",
  authenticate,
  requireRole("THERAPIST"),
  validateBody(createSlotRequestSchema),
  controller.createMySlot,
);
