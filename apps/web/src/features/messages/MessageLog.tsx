import { useEffect, useRef } from "react";
import clsx from "clsx";
import type { MessageResponse } from "@mind-hub/shared";
import { formatDateTime } from "../../lib/format";

/**
 * A scrolling conversation (role="log", so new messages are announced politely), used
 * by both between-session messaging and live chat sessions. Keeps itself scrolled to
 * the newest message.
 */
export function MessageLog({
  messages,
  currentUserId,
  counterpartName,
  isTherapist,
  emptyText,
  showSessionLabels = false,
}: {
  messages: MessageResponse[];
  currentUserId: string | undefined;
  counterpartName: string;
  isTherapist: boolean;
  emptyText: string;
  showSessionLabels?: boolean;
}) {
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  return (
    <ol ref={logRef} role="log" aria-label={`Conversation with ${counterpartName}`} className="max-h-[55vh] min-h-48 space-y-3 overflow-y-auto px-5 py-4">
      {messages.length === 0 && <li className="py-8 text-center text-sm text-stone-500">{emptyText}</li>}
      {messages.map((message) => {
        const isMine = message.senderId === currentUserId;
        const highlight = isTherapist && message.riskFlagged;
        return (
          <li key={message.id} className={clsx("flex flex-col", isMine ? "items-end" : "items-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                isMine ? "rounded-br-sm bg-brand-700 text-white" : "rounded-bl-sm bg-stone-100 text-stone-900",
                highlight && "ring-2 ring-rose-400",
              )}
            >
              <span className="sr-only">{isMine ? "You said: " : `${counterpartName} said: `}</span>
              <p className="break-words whitespace-pre-wrap">{message.body}</p>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {formatDateTime(message.createdAt)}
              {showSessionLabels && message.sessionId && " · during a live chat session"}
            </p>
            {highlight && (
              <p className="mt-0.5 text-xs font-medium text-rose-700">This message contains crisis language. Please check in with your client.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
