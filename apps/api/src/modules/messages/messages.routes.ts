import { Router } from "express";
import { z } from "zod";
import { sendMessageRequestSchema } from "@mind-hub/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./messages.controller.js";

export const messagesRoutes = Router();

const counterpartParamSchema = z.object({ counterpartId: z.string().uuid() });

messagesRoutes.use(authenticate, requireRole("CLIENT", "THERAPIST"));

messagesRoutes.get("/threads", controller.listThreads);
messagesRoutes.get("/unread-count", controller.unreadCount);
messagesRoutes.get("/threads/:counterpartId", validateParams(counterpartParamSchema), controller.getThread);
messagesRoutes.post(
  "/threads/:counterpartId",
  validateParams(counterpartParamSchema),
  validateBody(sendMessageRequestSchema),
  controller.send,
);
