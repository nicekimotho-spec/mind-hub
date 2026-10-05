import { useState } from "react";
import type { BookingDetail, SessionChannel, SessionOutcome } from "@mind-hub/shared";
import { useJoinSession } from "./hooks";
import { useCompleteSession } from "../sessions/hooks";
import { SessionChat } from "../sessions/SessionChat";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { SelectField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatTimeRange } from "../../lib/format";

export function SessionPanel({ booking, isTherapist }: { booking: BookingDetail; isTherapist: boolean }) {
  const [channel, setChannel] = useState<SessionChannel>("VIDEO");
  const [outcome, setOutcome] = useState<SessionOutcome>("COMPLETED");
  const joinSession = useJoinSession(booking.id);
  const completeSession = useCompleteSession(booking.id);

  const sessionInProgress = booking.sessionStatus === "IN_PROGRESS";
  // A chat that's already running (e.g. after a page refresh) reopens without rejoining:
  // the chat endpoints apply the same participant and time-window checks as joining.
  const chatSessionId =
    joinSession.data?.channel === "CHAT"
      ? joinSession.data.sessionId
      : sessionInProgress && booking.sessionChannel === "CHAT"
        ? booking.sessionId
        : null;
  const counterpartName = isTherapist ? booking.clientName : booking.therapistName;

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Session</h2>
      <p className="mt-1 text-sm text-stone-500">{formatTimeRange(booking.slot.startTime, booking.slot.endTime)}</p>

      {joinSession.isError && (
        <Alert variant="error" className="mt-3">
          {joinSession.error instanceof ApiClientError
            ? joinSession.error.message
            : "Couldn't join the session. If it's not yet time, try again closer to your session start."}
        </Alert>
      )}

      {chatSessionId ? (
        <SessionChat sessionId={chatSessionId} counterpartName={counterpartName} />
      ) : joinSession.data ? (
        <Alert variant="success" className="mt-3">
          You&apos;re connected via {joinSession.data.channel === "VIDEO" ? "video" : "audio"}. (This is a placeholder connection —
          no real video/audio provider is wired up yet; see docs/BUILD_PLAN.md §12.)
        </Alert>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <SelectField
              id="channel"
              label="Join by"
              value={channel}
              onChange={(e) => setChannel(e.target.value as SessionChannel)}
            >
              <option value="VIDEO">Video</option>
              <option value="AUDIO">Audio only</option>
              <option value="CHAT">Text chat</option>
            </SelectField>
          </div>
          <Button isLoading={joinSession.isPending} onClick={() => joinSession.mutate(channel)}>
            Join session
          </Button>
        </div>
      )}

      {isTherapist && (joinSession.data || sessionInProgress) && booking.sessionId && (
        <div className="mt-5 border-t border-stone-200 pt-4">
          <h3 className="text-sm font-medium text-stone-900">Wrap up this session</h3>
          {completeSession.isError && (
            <Alert variant="error" className="mt-2">
              {completeSession.error instanceof ApiClientError ? completeSession.error.message : "Couldn't record the outcome."}
            </Alert>
          )}
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <div className="w-48">
              <SelectField id="outcome" label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as SessionOutcome)}>
                <option value="COMPLETED">Session completed</option>
                <option value="NO_SHOW">Client didn't show up</option>
              </SelectField>
            </div>
            <Button
              variant="secondary"
              isLoading={completeSession.isPending}
              onClick={() => booking.sessionId && completeSession.mutate({ sessionId: booking.sessionId, outcome })}
            >
              Mark as done
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
