import type { RequestHandler } from "express";
import type { CreateBookingRequest, CreateFeedbackRequest, JoinSessionRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as bookingService from "./booking.service.js";
import * as consentService from "../consent/consent.service.js";
import * as sessionsService from "../sessions/sessions.service.js";
import * as feedbackService from "../feedback/feedback.service.js";

export const listMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const bookings = await bookingService.listOwnBookings(req.user.id, req.user.role);
    res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
};

export const getMine: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const bookingId = req.params["id"] as string;
    const booking = await bookingService.getOwnBookingDetail(req.user.id, req.user.role, bookingId);
    res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
};

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

export const consent: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const bookingId = req.params["id"] as string;
    const record = await consentService.recordConsent(req.user.id, bookingId);
    await recordAuditLog({
      actorId: req.user.id,
      action: "booking.consent",
      resourceType: "ConsentRecord",
      resourceId: record.id,
      metadata: { consentVersionId: record.consentVersionId },
    });
    res.status(200).json({ consent: record });
  } catch (err) {
    next(err);
  }
};

export const joinToken: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const bookingId = req.params["id"] as string;
    const { channel } = req.body as JoinSessionRequest;
    const result = await sessionsService.createOrGetJoinToken(req.user.id, req.user.role, bookingId, channel);
    await recordAuditLog({
      actorId: req.user.id,
      action: "session.join_token_issued",
      resourceType: "Session",
      resourceId: result.sessionId,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const feedback: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const bookingId = req.params["id"] as string;
    const input = req.body as CreateFeedbackRequest;
    const record = await feedbackService.submitFeedback(req.user.id, bookingId, input);
    await recordAuditLog({ actorId: req.user.id, action: "booking.feedback", resourceType: "Feedback", resourceId: record.id });
    res.status(201).json({ feedback: record });
  } catch (err) {
    next(err);
  }
};
