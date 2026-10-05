import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

// Polling stands in for push delivery: messaging is asynchronous by design (therapists
// aren't on call), so a few seconds' delay is fine and keeps the stack simple.
const THREAD_POLL_MS = 10_000;
const INBOX_POLL_MS = 30_000;

export function useMessageThreads() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["message-threads"],
    queryFn: () => api.listThreads(accessToken as string),
    enabled: Boolean(accessToken),
    refetchInterval: INBOX_POLL_MS,
  });
}

export function useMessageThread(counterpartId: string | undefined) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["message-thread", counterpartId],
    queryFn: async () => {
      const res = await api.getThread(accessToken as string, counterpartId as string);
      // Opening a thread marks the other person's messages read on the server; refresh
      // the unread badges only when this fetch actually did that.
      if (res.thread.messages.some((m) => m.senderId === counterpartId && m.readAt === null)) {
        void queryClient.invalidateQueries({ queryKey: ["message-unread-count"] });
        void queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      }
      return res;
    },
    enabled: Boolean(accessToken) && Boolean(counterpartId),
    refetchInterval: THREAD_POLL_MS,
  });
}

export function useSendMessage(counterpartId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(accessToken as string, counterpartId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["message-thread", counterpartId] });
      void queryClient.invalidateQueries({ queryKey: ["message-threads"] });
    },
  });
}

export function useUnreadMessageCount(enabled: boolean) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["message-unread-count"],
    queryFn: () => api.getUnreadCount(accessToken as string),
    enabled: enabled && Boolean(accessToken),
    refetchInterval: INBOX_POLL_MS,
  });
}
