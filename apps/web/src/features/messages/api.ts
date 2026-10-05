import type { MessageThread, MessageThreadSummary, SendMessageResponse } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function listThreads(accessToken: string) {
  return apiFetch<{ threads: MessageThreadSummary[] }>("/messages/threads", { accessToken });
}

export function getThread(accessToken: string, counterpartId: string) {
  return apiFetch<{ thread: MessageThread }>(`/messages/threads/${counterpartId}`, { accessToken });
}

export function sendMessage(accessToken: string, counterpartId: string, body: string) {
  return apiFetch<SendMessageResponse>(`/messages/threads/${counterpartId}`, { method: "POST", accessToken, body: { body } });
}

export function getUnreadCount(accessToken: string) {
  return apiFetch<{ count: number }>("/messages/unread-count", { accessToken });
}
