import { Router } from "express";
import * as controller from "./consent.controller.js";

export const consentRoutes = Router();

consentRoutes.get("/current-version", controller.getCurrentVersion);
