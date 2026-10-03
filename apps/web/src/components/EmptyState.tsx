import type { ReactNode } from "react";
import clsx from "clsx";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center", className)}>
      <p className="text-sm font-medium text-stone-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
