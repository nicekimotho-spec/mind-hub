import type { RequestHandler } from "express";
import type { PurchaseGiftRequest, RedeemGiftRequest } from "@mind-hub/shared";
import { AuthError, ValidationError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as giftsService from "./gifts.service.js";

export const purchase: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const idempotencyKey = req.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
      throw new ValidationError({ formErrors: ["Idempotency-Key header is required (min 8 characters)"], fieldErrors: {} });
    }
    const gift = await giftsService.purchase(req.user.id, req.body as PurchaseGiftRequest, idempotencyKey);
    await recordAuditLog({ actorId: req.user.id, action: "gift.purchase", resourceType: "GiftVoucher", resourceId: gift.id });
    res.status(202).json({ gift });
  } catch (err) {
    next(err);
  }
};

export const listMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    res.status(200).json({ gifts: await giftsService.listMine(req.user.id) });
  } catch (err) {
    next(err);
  }
};

export const redeem: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const { bookingId, code } = req.body as RedeemGiftRequest;
    const result = await giftsService.redeem(req.user.id, bookingId, code);
    await recordAuditLog({
      actorId: req.user.id,
      action: "gift.redeem",
      resourceType: "Payment",
      resourceId: result.payment.id,
      metadata: { bookingId },
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
