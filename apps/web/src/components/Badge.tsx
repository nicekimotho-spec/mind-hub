import clsx from "clsx";
import { formatStatusLabel } from "../lib/format";

export type BadgeTone = "neutral" | "positive" | "warning" | "negative" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  positive: "bg-emerald-100 text-emerald-800",
  warning: "bg-accent-100 text-accent-600",
  negative: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
};

/** Every status enum across the platform (booking, therapist, complaint, payment)
 * maps to one of five tones, so a client always sees the same color language for
 * "this needs attention" vs "this is fine" regardless of which entity it's about. */
const STATUS_TONES: Record<string, BadgeTone> = {
  PENDING_PAYMENT: "warning",
  CONFIRMED: "positive",
  CANCELLED: "neutral",
  COMPLETED: "positive",
  NO_SHOW: "negative",
  PENDING_VERIFICATION: "warning",
  VERIFIED: "info",
  ACTIVE: "positive",
  REJECTED: "negative",
  SUSPENDED: "negative",
  OPEN: "warning",
  IN_REVIEW: "info",
  RESOLVED: "positive",
  CLOSED: "neutral",
  INITIATED: "neutral",
  PENDING: "warning",
  SUCCEEDED: "positive",
  FAILED: "negative",
  REFUNDED: "info",
};

export function Badge({ tone, children, className }: { tone: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}

/** Convenience wrapper for any of the platform's status enums — looks up both the
 * color tone and the human-readable label automatically. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} className={className}>
      {formatStatusLabel(status)}
    </Badge>
  );
}
