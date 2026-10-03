import { useMutation, useQueryClient } from "@tanstack/react-query";
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
