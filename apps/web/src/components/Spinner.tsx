import clsx from "clsx";

const SIZE_CLASSES = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" } as const;

/** Purely decorative — the loading state itself is announced via aria-busy / status
 * text on the containing element, not this icon (see Button.tsx, PageSpinner below). */
export function Spinner({ size = "md", className }: { size?: keyof typeof SIZE_CLASSES; className?: string }) {
  return (
    <svg className={clsx("animate-spin", SIZE_CLASSES[size], className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-16 text-stone-500">
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
