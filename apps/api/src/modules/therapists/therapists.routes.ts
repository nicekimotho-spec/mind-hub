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

// Own-profile management — registered before the "/:id" wildcard routes below, since
// Express would otherwise match e.g. "/me/slots" against "/:id/slots" with id="me".
therapistsRoutes.get("/me/profile", authenticate, requireRole("THERAPIST"), controller.getMyProfile);
therapistsRoutes.get("/me/slots", authenticate, requireRole("THERAPIST"), controller.listMySlots);

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

// Public wildcard routes — registered last, after every literal "/me/*" path above.
therapistsRoutes.get("/:id", validateParams(idParamSchema), controller.getPublicById);
therapistsRoutes.get("/:id/slots", validateParams(idParamSchema), controller.listSlots);
