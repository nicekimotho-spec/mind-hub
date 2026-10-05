import type { RequestHandler } from "express";
import type { ApplyForFeeAssistanceRequest, DecideFeeAssistanceRequest, FeeAssistanceStatus } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAccessAuditLog, recordAuditLog } from "../../lib/auditLog.js";
import * as service from "./feeAssistance.service.js";

export const getMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    res.status(200).json(await service.getMine(req.user.id));
  } catch (err) {
    next(err);
  }
};

export const apply: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const application = await service.apply(req.user.id, req.body as ApplyForFeeAssistanceRequest);
    await recordAuditLog({ actorId: req.user.id, action: "fee_assistance.apply", resourceType: "FeeAssistanceApplication", resourceId: application.id });
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
};

/** Applications include income information, so even listing them is audit-logged. */
export const listForAdmin: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const { status } = (res.locals["query"] ?? {}) as { status?: FeeAssistanceStatus };
    const applications = await service.listForAdmin(status);
    await recordAccessAuditLog({ actorId: req.user.id, action: "fee_assistance.list", resourceType: "FeeAssistanceApplication", resourceId: status ?? "ALL" });
    res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
};

export const decide: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as DecideFeeAssistanceRequest;
    const application = await service.decide(req.user.id, req.params["id"] as string, input);
    await recordAuditLog({
      actorId: req.user.id,
      action: "fee_assistance.decide",
      resourceType: "FeeAssistanceApplication",
      resourceId: application.id,
      metadata: { decision: input.decision },
    });
    res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
};
