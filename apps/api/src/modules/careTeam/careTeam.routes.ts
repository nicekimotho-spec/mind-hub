import { Router, type RequestHandler } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { AuthError } from "../../lib/errors.js";
import { listCareTeam } from "./careTeam.service.js";

const listMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const members = await listCareTeam(req.user.id, req.user.role);
    res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
};

export const careTeamRoutes = Router();

careTeamRoutes.get("/", authenticate, requireRole("CLIENT", "THERAPIST"), listMine);
