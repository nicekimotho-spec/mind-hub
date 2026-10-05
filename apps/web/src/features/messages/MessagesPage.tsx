import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import clsx from "clsx";
import { MESSAGE_MAX_LENGTH, sendMessageRequestSchema } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import { useMessageThread, useMessageThreads, useSendMessage } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { LinkButton } from "../../components/LinkButton";
import { CrisisAlert } from "../../components/CrisisAlert";
import { TextareaField } from "../../components/fields";
import { ApiClientError } from "../../api/client";
import { formatDateTime } from "../../lib/format";
import { MessageLog } from "./MessageLog";

function ThreadList({ activeId }: { activeId: string | undefined }) {
  const { user } = useAuth();
  const { data, isLoading } = useMessageThreads();
  const isTherapist = user?.role === "THERAPIST";

  if (isLoading) return <PageSpinner label="Loading conversations..." />;

  const threads = data?.threads ?? [];
  if (threads.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description={
          isTherapist
            ? "Clients you've had a confirmed session with will appear here."
            : "Once you've booked and paid for a session, you can message your therapist here."
        }
        action={!isTherapist && <LinkButton to="/therapists">Find a therapist</LinkButton>}
      />
    );
  }

  return (
    <ul className="space-y-1">
      {threads.map((thread) => {
        const isActive = thread.counterpartId === activeId;
        return (
          <li key={thread.counterpartId}>
            <Link
              to={`/messages/${thread.counterpartId}`}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                isActive ? "bg-brand-50 text-brand-900" : "text-stone-700 hover:bg-stone-100",
              )}
            >
              <span className="min-w-0">
                <span className={clsx("block truncate", thread.unreadCount > 0 ? "font-semibold" : "font-medium")}>
                  {thread.counterpartName}
                </span>
                <span className="block text-xs text-stone-500">
                  {thread.lastMessage
                    ? `${thread.lastMessage.senderId === user?.id ? "You" : "They"} · ${formatDateTime(thread.lastMessage.createdAt)}`
                    : "No messages yet"}
                </span>
              </span>
              {thread.unreadCount > 0 && (
                <span className="shrink-0 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-medium text-white">
                  {thread.unreadCount}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ThreadView({ counterpartId }: { counterpartId: string }) {
  const { user } = useAuth();
  const isTherapist = user?.role === "THERAPIST";
  const { data, isLoading, isError } = useMessageThread(counterpartId);
  const sendMessage = useSendMessage(counterpartId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCrisisResources, setShowCrisisResources] = useState(false);
  if (isLoading) return <PageSpinner label="Loading conversation..." />;
  if (isError || !data) return <Alert variant="error">This conversation couldn&apos;t be loaded.</Alert>;

  const { counterpart, messages } = data.thread;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = sendMessageRequestSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your message");
      return;
    }
    try {
      const res = await sendMessage.mutateAsync(parsed.data.body);
      // Only clear what was sent: on a slow connection the person may already be typing
      // their next message, which must survive this one finishing.
      setDraft((current) => (current.trim() === parsed.data.body ? "" : current));
      if (res.showCrisisResources) setShowCrisisResources(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't send your message. Please try again.");
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <Link to="/messages" className="text-sm font-medium text-brand-700 hover:underline md:hidden">
            &larr; All
          </Link>
          <h2 className="font-medium text-stone-900">{counterpart.fullName}</h2>
        </div>
        {isTherapist ? (
          <Link to={`/clients/${counterpart.id}`} className="text-sm font-medium text-brand-700 hover:underline">
            Shared by {counterpart.fullName}
          </Link>
        ) : (
          <Link to={`/switch-therapist/${counterpart.id}`} className="text-sm font-medium text-brand-700 hover:underline">
            Switch therapist
          </Link>
        )}
      </div>

      <MessageLog
        messages={messages}
        currentUserId={user?.id}
        counterpartName={counterpart.fullName}
        isTherapist={isTherapist}
        emptyText={isTherapist ? "No messages yet." : "No messages yet. Say hello, or share what you'd like to talk about next time."}
        showSessionLabels
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-3 border-t border-stone-200 px-5 py-4">
        {showCrisisResources && <CrisisAlert />}
        <TextareaField
          id="message-body"
          label="Your message"
          rows={3}
          maxLength={MESSAGE_MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          error={error ?? undefined}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-500">
            {isTherapist
              ? "Clients are told messages aren't monitored around the clock."
              : "Messages aren't monitored around the clock. In an emergency, call 999 or 112."}
          </p>
          <Button type="submit" isLoading={sendMessage.isPending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MessagesPage() {
  const { counterpartId } = useParams<{ counterpartId: string }>();
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Messages"
        description={
          user?.role === "THERAPIST"
            ? "Conversations with your clients between sessions."
            : "Message your therapist between sessions. They'll reply when they're next working."
        }
      />
      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <nav aria-label="Conversations" className={clsx(counterpartId && "hidden md:block")}>
          <ThreadList activeId={counterpartId} />
        </nav>
        <div className={clsx(!counterpartId && "hidden md:block")}>
          {counterpartId ? (
            <ThreadView key={counterpartId} counterpartId={counterpartId} />
          ) : (
            <EmptyState title="Choose a conversation" description="Pick someone from the list to read and send messages." />
          )}
        </div>
      </div>
    </div>
  );
}
