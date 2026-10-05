import { z } from "zod";

export const MESSAGE_MAX_LENGTH = 4000;

export const sendMessageRequestSchema = z.object({
  body: z.string().trim().min(1, "Write a message first").max(MESSAGE_MAX_LENGTH),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string(),
  riskFlagged: z.boolean(),
  /** Set when the message was sent during a live text-chat session. */
  sessionId: z.string().uuid().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type MessageResponse = z.infer<typeof messageSchema>;

/** Deliberately carries no message text: the inbox is polled, and keeping content out
 * of it means only opening a conversation exposes (and audit-logs) what was said. */
export const messageThreadSummarySchema = z.object({
  counterpartId: z.string().uuid(),
  counterpartName: z.string(),
  lastMessage: z
    .object({
      senderId: z.string().uuid(),
      createdAt: z.string(),
    })
    .nullable(),
  unreadCount: z.number().int().nonnegative(),
});
export type MessageThreadSummary = z.infer<typeof messageThreadSummarySchema>;

export const messageThreadSchema = z.object({
  counterpart: z.object({ id: z.string().uuid(), fullName: z.string() }),
  messages: z.array(messageSchema),
});
export type MessageThread = z.infer<typeof messageThreadSchema>;

export const sendMessageResponseSchema = z.object({
  message: messageSchema,
  /** True when the message contained crisis language; the UI then shows emergency numbers. */
  showCrisisResources: z.boolean(),
});
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
