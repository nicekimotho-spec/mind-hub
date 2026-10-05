import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignWorksheetRequest, CreateGoalRequest, JournalEntryRequest, UpdateGoalRequest, UpdateWorksheetRequest } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

function useToken() {
  return useAuth().accessToken as string;
}

export function useJournal() {
  const { accessToken } = useAuth();
  return useQuery({ queryKey: ["journal"], queryFn: () => api.listJournal(accessToken as string), enabled: Boolean(accessToken) });
}

export function useSaveJournalEntry() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: JournalEntryRequest }) =>
      id ? api.updateJournalEntry(token, id, input) : api.createJournalEntry(token, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal"] }),
  });
}

export function useDeleteJournalEntry() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteJournalEntry(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal"] }),
  });
}

export function useGoals() {
  const { accessToken } = useAuth();
  return useQuery({ queryKey: ["goals"], queryFn: () => api.listGoals(accessToken as string), enabled: Boolean(accessToken) });
}

export function useCreateGoal() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalRequest) => api.createGoal(token, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalRequest }) => api.updateGoal(token, id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGoal(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useWorksheetResponses() {
  const { accessToken } = useAuth();
  return useQuery({ queryKey: ["worksheets"], queryFn: () => api.listWorksheets(accessToken as string), enabled: Boolean(accessToken) });
}

export function useWorksheetResponse(id: string | undefined) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["worksheet", id],
    queryFn: () => api.getWorksheetResponse(accessToken as string, id as string),
    enabled: Boolean(accessToken) && Boolean(id),
  });
}

export function useStartWorksheet() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (worksheetSlug: string) => api.startWorksheet(token, worksheetSlug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worksheets"] }),
  });
}

export function useUpdateWorksheet(id: string) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorksheetRequest) => api.updateWorksheet(token, id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(["worksheet", id], data);
      void queryClient.invalidateQueries({ queryKey: ["worksheets"] });
    },
  });
}

export function useDeleteWorksheet() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorksheet(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worksheets"] }),
  });
}

export function useAssignWorksheet(clientId: string) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<AssignWorksheetRequest, "clientId">) => api.assignWorksheet(token, { ...input, clientId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shared-by-client", clientId] }),
  });
}

export function useSharedByClient(clientId: string | undefined) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["shared-by-client", clientId],
    queryFn: () => api.getSharedByClient(accessToken as string, clientId as string),
    enabled: Boolean(accessToken) && Boolean(clientId),
  });
}
