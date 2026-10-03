import { Router } from "express";
import { initiatePaymentRequestSchema } from "@mind-hub/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody } from "../../middleware/validate.js";
import { mpesaIpAllowlist } from "../../middleware/mpesaIpAllowlist.js";
import * as controller from "./payments.controller.js";

export const paymentsRoutes = Router();

paymentsRoutes.post(
  "/mpesa/initiate",
  authenticate,
  requireRole("CLIENT"),
  validateBody(initiatePaymentRequestSchema),
  controller.initiate,
);

// No `authenticate` — this is called by Safaricom's servers, not a Mind Hub user.
paymentsRoutes.post("/mpesa/callback", mpesaIpAllowlist, controller.callback);
