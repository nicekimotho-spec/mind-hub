import type { RequestHandler } from "express";
import type { UserRole } from "@mind-hub/shared";
import { ForbiddenError } from "../lib/errors.js";

/**
 * Role check only. Ownership of a specific resource (e.g. "is this booking mine?") is a
 * separate, explicit check inside the handler — never conflate "authenticated with role X"
 * with "authorized for this specific resource" (see BUILD_PLAN.md §6 and §8.6).
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError("You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
