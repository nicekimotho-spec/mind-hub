import { useState } from "react";
import clsx from "clsx";

const SIZE_CLASSES = { md: "h-12 w-12 text-base", lg: "h-20 w-20 text-2xl" } as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

/** A therapist's photo, falling back to their initials when there's no photo or the
 * link is broken. Decorative (alt=""): the name is always shown next to it. */
export function Avatar({ name, photoUrl, size = "md" }: { name: string; photoUrl: string | null; size?: keyof typeof SIZE_CLASSES }) {
  const [failed, setFailed] = useState(false);
  const classes = clsx("shrink-0 rounded-full", SIZE_CLASSES[size]);

  if (photoUrl && !failed) {
    return <img src={photoUrl} alt="" onError={() => setFailed(true)} className={clsx(classes, "object-cover")} />;
  }
  return (
    <span aria-hidden="true" className={clsx(classes, "flex items-center justify-center bg-brand-100 font-semibold text-brand-800")}>
      {initialsOf(name)}
    </span>
  );
}
