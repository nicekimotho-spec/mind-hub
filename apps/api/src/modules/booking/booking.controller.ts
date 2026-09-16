import type { RequestHandler } from "express";
import type { CreateBookingRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as bookingService from "./booking.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as CreateBookingRequest;
    const booking = await bookingService.createBooking(req.user.id, input);
    await recordAuditLog({ actorId: req.user.id, action: "booking.create", resourceType: "Booking", resourceId: booking.id });
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const bookingId = req.params["id"] as string;
    const booking = await bookingService.cancelBooking(req.user.id, req.user.role, bookingId);
    await recordAuditLog({ actorId: req.user.id, action: "booking.cancel", resourceType: "Booking", resourceId: booking.id });
    res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
};
