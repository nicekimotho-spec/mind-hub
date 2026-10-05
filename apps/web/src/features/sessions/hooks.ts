import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionOutcome } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

export function useCompleteSession(bookingId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, outcome }: { sessionId: string; outcome: SessionOutcome }) =>
      api.completeSession(accessToken as string, sessionId, outcome),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

// Live chat needs to feel live: a short poll while the session panel is open.
const CHAT_POLL_MS = 3000;

export function useSessionChat(sessionId: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["session-chat", sessionId],
    queryFn: () => api.getSessionChat(accessToken as string, sessionId),
    enabled: Boolean(accessToken),
    refetchInterval: (query) => (query.state.data?.canSend === false ? false : CHAT_POLL_MS),
  });
}

export function useSendSessionChatMessage(sessionId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendSessionChatMessage(accessToken as string, sessionId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session-chat", sessionId] }),
  });
}
