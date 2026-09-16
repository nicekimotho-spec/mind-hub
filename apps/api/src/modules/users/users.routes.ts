import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as controller from "./users.controller.js";

export const usersRoutes = Router();

usersRoutes.get("/me", authenticate, controller.me);
