import type {
  AddCredentialRequest,
  CreateSlotRequest,
  PublicSlot,
  PublicTherapist,
  TherapistDirectoryQuery,
  UpdateTherapistProfileRequest,
} from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export interface TherapistCredentialRecord {
  id: string;
  type: string;
  documentUrl: string;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface OwnTherapistProfile {
  userId: string;
  fullName: string;
  status: string;
  bio: string | null;
  specialties: string[];
  languages: string[];
  approach: string | null;
  feeKES: number;
  verifiedAt: string | null;
  createdAt: string;
  credentials: TherapistCredentialRecord[];
}

export function listTherapists(query: TherapistDirectoryQuery) {
  return apiFetch<{ therapists: PublicTherapist[] }>("/therapists", { query });
}

export function getTherapist(id: string) {
  return apiFetch<{ therapist: PublicTherapist }>(`/therapists/${id}`);
}

export function getTherapistSlots(id: string) {
  return apiFetch<{ slots: PublicSlot[] }>(`/therapists/${id}/slots`);
}

export function getMyTherapistProfile(accessToken: string) {
  return apiFetch<{ profile: OwnTherapistProfile }>("/therapists/me/profile", { accessToken });
}

export function updateMyTherapistProfile(accessToken: string, input: UpdateTherapistProfileRequest) {
  return apiFetch<{ profile: OwnTherapistProfile }>("/therapists/me/profile", { method: "PATCH", accessToken, body: input });
}

export function addMyCredential(accessToken: string, input: AddCredentialRequest) {
  return apiFetch<{ credential: TherapistCredentialRecord }>("/therapists/me/credentials", { method: "POST", accessToken, body: input });
}

export function createMySlot(accessToken: string, input: CreateSlotRequest) {
  return apiFetch<{ slot: PublicSlot }>("/therapists/me/slots", {
    method: "POST",
    accessToken,
    body: { startTime: input.startTime.toISOString(), endTime: input.endTime.toISOString() },
  });
}

export function listMySlots(accessToken: string) {
  return apiFetch<{ slots: PublicSlot[] }>("/therapists/me/slots", { accessToken });
}
