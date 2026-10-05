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

/**
 * For read access to something the UI polls, like an open message thread: writes the
 * entry only if this actor has no identical entry within `withinMs`. The audit trail
 * then records "viewed this conversation" once per sitting instead of every few seconds.
 */
export async function recordAccessAuditLog(params: AuditLogParams, withinMs = 30 * 60_000): Promise<void> {
  const recent = await prisma.auditLogEntry.findFirst({
    where: {
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      createdAt: { gte: new Date(Date.now() - withinMs) },
    },
    select: { id: true },
  });
  if (!recent) {
    await recordAuditLog(params);
  }
}
