import { useState, type FormEvent } from "react";
import { MESSAGE_MAX_LENGTH, sendMessageRequestSchema } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import { useSendSessionChatMessage, useSessionChat } from "./hooks";
import { MessageLog } from "../messages/MessageLog";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { CrisisAlert } from "../../components/CrisisAlert";
import { PageSpinner } from "../../components/Spinner";
import { TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";

const timeFormatter = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" });

/** A live text-chat session, for clients who'd rather type, or whose connection can't carry audio. */
export function SessionChat({ sessionId, counterpartName }: { sessionId: string; counterpartName: string }) {
  const { user } = useAuth();
  const isTherapist = user?.role === "THERAPIST";
  const { data, isLoading, isError } = useSessionChat(sessionId);
  const send = useSendSessionChatMessage(sessionId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  if (isLoading) return <PageSpinner label="Opening chat..." />;
  if (isError || !data) return <Alert variant="error">The chat couldn&apos;t be loaded. Please refresh the page.</Alert>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = sendMessageRequestSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your message");
      return;
    }
    try {
      const res = await send.mutateAsync(parsed.data.body);
      // Only clear what was sent: on a slow connection the person may already be typing
      // their next message, which must survive this one finishing.
      setDraft((current) => (current.trim() === parsed.data.body ? "" : current));
      if (res.showCrisisResources) setShowCrisisResources(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't send. Please try again.");
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-5 py-2.5 text-sm">
        <span className="font-medium text-stone-900">Live chat with {counterpartName}</span>
        <span className="text-stone-500">
          {data.canSend ? `Open until ${timeFormatter.format(new Date(data.endsAt))}` : "This chat has ended"}
        </span>
      </div>
      <MessageLog
        messages={data.messages}
        currentUserId={user?.id}
        counterpartName={counterpartName}
        isTherapist={isTherapist}
        emptyText={isTherapist ? "Say hello to start the session." : "Your therapist will be with you shortly."}
      />
      {data.canSend && (
        <form onSubmit={handleSubmit} noValidate className="space-y-3 border-t border-stone-200 px-5 py-4">
          {showCrisisResources && <CrisisAlert />}
          <TextareaField
            id="chat-body"
            label="Your message"
            rows={2}
            maxLength={MESSAGE_MAX_LENGTH}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            error={error ?? undefined}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={send.isPending}>
              Send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
