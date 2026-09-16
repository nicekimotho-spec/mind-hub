import type { RequestHandler } from "express";
import type { UserRole } from "@mind-hub/shared";
import { verifyAccessToken } from "../lib/jwt.js";
import { AuthError } from "../lib/errors.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: UserRole };
  }
}

/** Verifies the access token and attaches { id, role } to req.user. Does not hit the DB. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AuthError("Missing or malformed Authorization header"));
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role as UserRole };
    next();
  } catch {
    next(new AuthError("Invalid or expired access token"));
  }
};
