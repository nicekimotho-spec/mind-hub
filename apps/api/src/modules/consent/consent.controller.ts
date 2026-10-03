import type { RequestHandler } from "express";
import * as consentService from "./consent.service.js";

export const getCurrentVersion: RequestHandler = async (_req, res, next) => {
  try {
    const version = await consentService.getCurrentConsentVersion();
    res.status(200).json({ consentVersion: version });
  } catch (err) {
    next(err);
  }
};
