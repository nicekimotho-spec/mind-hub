import { useState } from "react";
import { useCancelBooking } from "./hooks";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Alert } from "../../components/Alert";
import { ApiClientError } from "../../api/client";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const cancelBooking = useCancelBooking(bookingId);

  async function handleConfirm() {
    try {
      await cancelBooking.mutateAsync();
      setOpen(false);
    } catch {
      // error is shown inline below; keep the modal open so the user sees it
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Cancel this booking?">
        <p className="text-sm text-stone-600">This can&apos;t be undone. The time slot will be released back to the therapist&apos;s availability.</p>

        {cancelBooking.isError && (
          <Alert variant="error" className="mt-3">
            {cancelBooking.error instanceof ApiClientError ? cancelBooking.error.message : "Couldn't cancel the booking."}
          </Alert>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Keep booking
          </Button>
          <Button variant="danger" isLoading={cancelBooking.isPending} onClick={handleConfirm}>
            Yes, cancel it
          </Button>
        </div>
      </Modal>
    </>
  );
}
