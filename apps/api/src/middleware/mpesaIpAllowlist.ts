import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ForbiddenError } from "../lib/errors.js";

/**
 * Safaricom does not sign Daraja callbacks (no HMAC/shared secret), so the realistic
 * mitigation is restricting which source IPs may hit this endpoint — see PRD §6 and
 * BUILD_PLAN.md §5. The allowlist is optional and unset by default: enforcing a
 * specific IP range is a deployment-environment concern (and Safaricom's ranges can
 * change), so this only activates when MPESA_CALLBACK_ALLOWED_IPS is explicitly
 * configured, e.g. in production behind a reverse proxy that sets req.ip correctly.
 */
export const mpesaIpAllowlist: RequestHandler = (req, _res, next) => {
  const allowlist = env.MPESA_CALLBACK_ALLOWED_IPS;
  if (!allowlist) {
    next();
    return;
  }
  const allowedIps = allowlist.split(",").map((ip) => ip.trim());
  if (!allowedIps.includes(req.ip ?? "")) {
    next(new ForbiddenError("Source IP not permitted for this endpoint"));
    return;
  }
  next();
};
