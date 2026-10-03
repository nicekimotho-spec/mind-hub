import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import * as controller from "./adminReports.controller.js";

export const adminReportsRoutes = Router();

adminReportsRoutes.get("/overview", authenticate, requireRole("ADMIN"), controller.overview);
