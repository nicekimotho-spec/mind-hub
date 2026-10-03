import clsx from "clsx";

export type AlertVariant = "error" | "success" | "warning" | "info";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "bg-rose-50 text-rose-800 border-rose-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-accent-50 text-accent-600 border-accent-100",
  info: "bg-sky-50 text-sky-800 border-sky-200",
};

/** Errors are assertive (role="alert") — they interrupt because the user needs to act
 * on them now. Success/warning/info are polite (role="status") — worth announcing, not
 * worth cutting off whatever the screen reader was already saying. */
export function Alert({ variant, children, className }: { variant: AlertVariant; children: React.ReactNode; className?: string }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={clsx("rounded-lg border px-4 py-3 text-sm", VARIANT_CLASSES[variant], className)}
    >
      {children}
    </div>
  );
}
