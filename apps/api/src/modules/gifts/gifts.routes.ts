import { Router } from "express";
import { purchaseGiftRequestSchema, redeemGiftRequestSchema } from "@mind-hub/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody } from "../../middleware/validate.js";
import { giftRedeemRateLimiter } from "../../middleware/rateLimit.js";
import * as controller from "./gifts.controller.js";

export const giftsRoutes = Router();

giftsRoutes.use(authenticate, requireRole("CLIENT"));
giftsRoutes.get("/mine", controller.listMine);
giftsRoutes.post("/", validateBody(purchaseGiftRequestSchema), controller.purchase);
giftsRoutes.post("/redeem", giftRedeemRateLimiter, validateBody(redeemGiftRequestSchema), controller.redeem);
