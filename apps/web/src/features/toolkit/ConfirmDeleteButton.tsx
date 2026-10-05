import { useState } from "react";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";

/** Deleting reflective writing can't be undone, so it always asks first. */
export function ConfirmDeleteButton({ itemLabel, onConfirm, isPending }: { itemLabel: string; onConfirm: () => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Delete this ${itemLabel}?`}>
        <p className="text-sm text-stone-600">This can&apos;t be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            isLoading={isPending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
