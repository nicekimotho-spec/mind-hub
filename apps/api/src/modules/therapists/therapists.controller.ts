import type { RequestHandler } from "express";
import type { AddCredentialRequest, CreateSlotRequest, TherapistDirectoryQuery, UpdateTherapistProfileRequest } from "@mind-hub/shared";
import { AuthError } from "../../lib/errors.js";
import { recordAuditLog } from "../../lib/auditLog.js";
import * as therapistsService from "./therapists.service.js";

export const listPublic: RequestHandler = async (_req, res, next) => {
  try {
    const query = res.locals["query"] as TherapistDirectoryQuery;
    const therapists = await therapistsService.listActiveTherapists(query);
    res.status(200).json({ therapists });
  } catch (err) {
    next(err);
  }
};

export const getPublicById: RequestHandler = async (req, res, next) => {
  try {
    const therapist = await therapistsService.getActiveTherapistById(req.params["id"] as string);
    res.status(200).json({ therapist });
  } catch (err) {
    next(err);
  }
};

export const getMyProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const profile = await therapistsService.getOwnTherapistProfile(req.user.id);
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

export const updateMyProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as UpdateTherapistProfileRequest;
    const profile = await therapistsService.updateOwnTherapistProfile(req.user.id, input);
    await recordAuditLog({ actorId: req.user.id, action: "therapist.update_profile", resourceType: "TherapistProfile", resourceId: profile.userId });
    res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

export const addMyCredential: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as AddCredentialRequest;
    const credential = await therapistsService.addOwnCredential(req.user.id, input);
    await recordAuditLog({ actorId: req.user.id, action: "therapist.add_credential", resourceType: "TherapistCredential", resourceId: credential.id });
    res.status(201).json({ credential });
  } catch (err) {
    next(err);
  }
};

export const createMySlot: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const input = req.body as CreateSlotRequest;
    const slot = await therapistsService.createOwnSlot(req.user.id, input);
    await recordAuditLog({ actorId: req.user.id, action: "therapist.create_slot", resourceType: "AvailabilitySlot", resourceId: slot.id });
    res.status(201).json({ slot });
  } catch (err) {
    next(err);
  }
};

export const listSlots: RequestHandler = async (req, res, next) => {
  try {
    const slots = await therapistsService.listPublicSlots(req.params["id"] as string);
    res.status(200).json({ slots });
  } catch (err) {
    next(err);
  }
};

export const listMySlots: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthError("Not authenticated");
    const slots = await therapistsService.listOwnSlots(req.user.id);
    res.status(200).json({ slots });
  } catch (err) {
    next(err);
  }
};
