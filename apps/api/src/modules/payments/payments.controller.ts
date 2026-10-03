import type { RequestHandler } from "express";
import type { InitiatePaymentRequest } from "@mind-hub/shared";
import type { MpesaStkCallbackPayload } from "../../lib/mpesa.js";
import { AuthError, ValidationError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as paymentsService from "./payments.service.js";

export const initiate: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const idempotencyKey = req.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
      throw new ValidationError({ formErrors: ["Idempotency-Key header is required (min 8 characters)"], fieldErrors: {} });
    }
    const input = req.body as InitiatePaymentRequest;
    const payment = await paymentsService.initiatePayment(req.user.id, input.bookingId, idempotencyKey);
    await recordAuditLog({ actorId: req.user.id, action: "payment.initiate", resourceType: "Payment", resourceId: payment.id });
    res.status(202).json({ payment });
  } catch (err) {
    next(err);
  }
};

/** Public — Safaricom calls this directly, never a logged-in user. Always 200s (see
 * payments.service.ts handleMpesaCallback doc comment) so Daraja doesn't retry-storm us. */
export const callback: RequestHandler = async (req, res) => {
  try {
    await paymentsService.handleMpesaCallback(req.body as MpesaStkCallbackPayload);
  } catch (err) {
    req.log.error({ err }, "Error processing M-Pesa callback");
  }
  res.status(200).json({ ResultCode: 0, ResultDesc: "Confirmation Received Successfully" });
};
