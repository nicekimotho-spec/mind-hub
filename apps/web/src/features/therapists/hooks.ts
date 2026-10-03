import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddCredentialRequest, CreateSlotRequest, TherapistDirectoryQuery, UpdateTherapistProfileRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useTherapists(query: TherapistDirectoryQuery) {
  return useQuery({
    queryKey: ["therapists", query],
    queryFn: () => api.listTherapists(query),
  });
}

export function useTherapist(id: string | undefined) {
  return useQuery({
    queryKey: ["therapist", id],
    queryFn: () => api.getTherapist(id as string),
    enabled: Boolean(id),
  });
}

export function useTherapistSlots(id: string | undefined) {
  return useQuery({
    queryKey: ["therapist-slots", id],
    queryFn: () => api.getTherapistSlots(id as string),
    enabled: Boolean(id),
  });
}

export function useMyTherapistProfile() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["my-therapist-profile"],
    queryFn: () => api.getMyTherapistProfile(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useUpdateTherapistProfile() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTherapistProfileRequest) => api.updateMyTherapistProfile(accessToken as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-therapist-profile"] }),
  });
}

export function useAddCredential() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCredentialRequest) => api.addMyCredential(accessToken as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-therapist-profile"] }),
  });
}

export function useMySlots() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["my-slots"],
    queryFn: () => api.listMySlots(accessToken as string),
    enabled: Boolean(accessToken),
  });
}

export function useCreateSlot() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSlotRequest) => api.createMySlot(accessToken as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-slots"] }),
  });
}
