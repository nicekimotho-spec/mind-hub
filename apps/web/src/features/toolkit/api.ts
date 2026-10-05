import type {
  AssignWorksheetRequest,
  CreateGoalRequest,
  GoalResponse,
  JournalEntryRequest,
  JournalEntryResponse,
  SharedWithTherapist,
  UpdateGoalRequest,
  UpdateWorksheetRequest,
  WorksheetResponseRecord,
} from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function listJournal(accessToken: string) {
  return apiFetch<{ entries: JournalEntryResponse[] }>("/journal", { accessToken });
}

export function createJournalEntry(accessToken: string, input: JournalEntryRequest) {
  return apiFetch<{ entry: JournalEntryResponse }>("/journal", { method: "POST", accessToken, body: input });
}

export function updateJournalEntry(accessToken: string, id: string, input: JournalEntryRequest) {
  return apiFetch<{ entry: JournalEntryResponse }>(`/journal/${id}`, { method: "PUT", accessToken, body: input });
}

export function deleteJournalEntry(accessToken: string, id: string) {
  return apiFetch<void>(`/journal/${id}`, { method: "DELETE", accessToken });
}

export function listGoals(accessToken: string) {
  return apiFetch<{ goals: GoalResponse[] }>("/goals", { accessToken });
}

export function createGoal(accessToken: string, input: CreateGoalRequest) {
  return apiFetch<{ goal: GoalResponse }>("/goals", { method: "POST", accessToken, body: input });
}

export function updateGoal(accessToken: string, id: string, input: UpdateGoalRequest) {
  return apiFetch<{ goal: GoalResponse }>(`/goals/${id}`, { method: "PATCH", accessToken, body: input });
}

export function deleteGoal(accessToken: string, id: string) {
  return apiFetch<void>(`/goals/${id}`, { method: "DELETE", accessToken });
}

export function listWorksheets(accessToken: string) {
  return apiFetch<{ worksheets: WorksheetResponseRecord[] }>("/worksheets/responses", { accessToken });
}

export function getWorksheetResponse(accessToken: string, id: string) {
  return apiFetch<{ worksheet: WorksheetResponseRecord }>(`/worksheets/responses/${id}`, { accessToken });
}

export function startWorksheet(accessToken: string, worksheetSlug: string) {
  return apiFetch<{ worksheet: WorksheetResponseRecord }>("/worksheets/responses", { method: "POST", accessToken, body: { worksheetSlug } });
}

export function updateWorksheet(accessToken: string, id: string, input: UpdateWorksheetRequest) {
  return apiFetch<{ worksheet: WorksheetResponseRecord }>(`/worksheets/responses/${id}`, { method: "PATCH", accessToken, body: input });
}

export function deleteWorksheet(accessToken: string, id: string) {
  return apiFetch<void>(`/worksheets/responses/${id}`, { method: "DELETE", accessToken });
}

export function assignWorksheet(accessToken: string, input: AssignWorksheetRequest) {
  return apiFetch<{ worksheet: WorksheetResponseRecord }>("/worksheets/assignments", { method: "POST", accessToken, body: input });
}

export function getSharedByClient(accessToken: string, clientId: string) {
  return apiFetch<{ shared: SharedWithTherapist }>(`/clients/${clientId}/shared`, { accessToken });
}
