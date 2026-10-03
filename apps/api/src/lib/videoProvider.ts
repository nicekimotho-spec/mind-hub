import crypto from "node:crypto";
import { logger } from "./logger.js";

/**
 * No video/audio SDK is wired up yet (Daily.co / Twilio / Agora — to be evaluated, see
 * BUILD_PLAN.md §12). This generates an opaque, single-purpose token so the join-
 * authorization flow around it (BUILD_PLAN.md §8.5 — the part that actually matters for
 * MVP correctness) is fully real and testable. Swapping in a real provider later means
 * replacing the body of this one function with a call to that provider's REST API to
 * mint a room token for `sessionId` scoped to `participantId` — nothing about the
 * authorization logic that calls it needs to change.
 */
export function createRoomToken(sessionId: string, participantId: string): string {
  const token = crypto.randomBytes(24).toString("hex");
  logger.info({ sessionId, participantId }, "Issued stub video room token (no real video SDK wired up yet)");
  return token;
}
