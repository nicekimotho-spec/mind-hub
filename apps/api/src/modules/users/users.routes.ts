import { Router } from "express";
import { notificationPreferencesSchema } from "@mind-hub/shared";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import * as controller from "./users.controller.js";

export const usersRoutes = Router();

usersRoutes.get("/me", authenticate, controller.me);
usersRoutes.get("/me/preferences", authenticate, controller.getPreferences);
usersRoutes.patch("/me/preferences", authenticate, validateBody(notificationPreferencesSchema), controller.updatePreferences);
