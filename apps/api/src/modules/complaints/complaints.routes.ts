import { Router } from "express";
import { createComplaintRequestSchema } from "@mind-hub/shared";
import { idParamSchema } from "../../lib/paramSchemas.js";
import { authenticate } from "../../middleware/auth.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import * as controller from "./complaints.controller.js";

export const complaintsRoutes = Router();

complaintsRoutes.use(authenticate);

complaintsRoutes.post("/", validateBody(createComplaintRequestSchema), controller.create);
complaintsRoutes.get("/", controller.listMine);
complaintsRoutes.get("/:id", validateParams(idParamSchema), controller.getMine);
