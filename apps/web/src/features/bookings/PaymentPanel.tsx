import type { BookingDetail } from "@mind-hub/shared";
import { useInitiatePayment } from "../payments/hooks";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { formatKES } from "../../lib/format";
import { ApiClientError } from "../../api/client";

export function PaymentPanel({ booking }: { booking: BookingDetail }) {
  const initiatePayment = useInitiatePayment(booking.id);
  const isPending = booking.paymentStatus === "PENDING";
  const isFailed = booking.paymentStatus === "FAILED";

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Payment</h2>
      <p className="mt-1 text-sm text-stone-500">
        Your session is held for you, but not confirmed until payment goes through — {formatKES(booking.feeKES)} via M-Pesa.
      </p>

      {isPending && (
        <Alert variant="info" className="mt-3">
          Check your phone for the M-Pesa prompt and enter your PIN. This page will update automatically once it&apos;s confirmed.
        </Alert>
      )}

      {isFailed && (
        <Alert variant="error" className="mt-3">
          That payment attempt didn&apos;t go through. You can try again below.
        </Alert>
      )}

      {initiatePayment.isError && (
        <Alert variant="error" className="mt-3">
          {initiatePayment.error instanceof ApiClientError ? initiatePayment.error.message : "Couldn't start the payment. Please try again."}
        </Alert>
      )}

      {!isPending && (
        <Button className="mt-4" isLoading={initiatePayment.isPending} onClick={() => initiatePayment.mutate()}>
          {isFailed ? "Try payment again" : `Pay ${formatKES(booking.feeKES)} with M-Pesa`}
        </Button>
      )}
    </Card>
  );
}
