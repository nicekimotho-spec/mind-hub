import type { RequestHandler } from "express";
import * as adminReportsService from "./adminReports.service.js";

export const overview: RequestHandler = async (_req, res, next) => {
  try {
    const report = await adminReportsService.getReportsOverview();
    res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
};
