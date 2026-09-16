import { prisma } from "./db.js";
import { logger } from "./logger.js";

interface AuditLogParams {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: unknown;
}

/**
 * Writes an AuditLogEntry (FR-ADM-05 / NFR-SEC-04). Callers `await` this before sending
 * their response — an earlier version wrote on the Express `res.on("finish")` event
 * without awaiting the insert, which raced the response actually reaching the caller:
 * a client (or a test) could observe a 200/201 before the audit row existed, or the
 * process could exit between "response sent" and "write completed" and lose the audit
 * trail for that action entirely. A caller does not fail its own request if the audit
 * write itself fails — that failure is logged loudly instead — but the row is
 * guaranteed to exist by the time a caller who succeeded gets their response.
 */
export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLogEntry.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: (params.metadata as object | undefined) ?? undefined,
      },
    });
  } catch (err) {
    logger.error({ err, action: params.action, resourceType: params.resourceType, resourceId: params.resourceId }, "failed to write audit log entry");
  }
}
