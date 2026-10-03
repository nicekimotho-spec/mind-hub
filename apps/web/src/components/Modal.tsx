import { useEffect, useRef, type ReactNode } from "react";

/**
 * Built on the native <dialog> element rather than a custom implementation — it gives
 * focus trapping, Escape-to-close, and backdrop semantics for free, and is exactly the
 * kind of thing worth not reinventing for an accessible modal.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
      className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl backdrop:bg-stone-900/40"
    >
      <h2 id="modal-title" className="text-lg font-semibold text-stone-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}
