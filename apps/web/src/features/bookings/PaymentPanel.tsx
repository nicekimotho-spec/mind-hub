import { useState, type FormEvent } from "react";
import type { BookingDetail } from "@mind-hub/shared";
import { useInitiatePayment } from "../payments/hooks";
import { useRedeemGift } from "../gifts/hooks";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { TextField } from "../../components/fields";
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

      {!isPending && <GiftCodeForm bookingId={booking.id} />}
    </Card>
  );
}

/** Pays the whole session from a gift balance instead of M-Pesa (see the API's gifts.service.ts). */
function GiftCodeForm({ bookingId }: { bookingId: string }) {
  const redeem = useRedeemGift(bookingId);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  if (!open) {
    return (
      <p className="mt-4 text-sm text-stone-600">
        Have a gift code?{" "}
        <button type="button" onClick={() => setOpen(true)} className="font-medium text-brand-700 hover:underline">
          Use it instead
        </button>
      </p>
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) redeem.mutate(code.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-stone-200 pt-4">
      <div className="sm:max-w-xs">
        <TextField
          id="giftCode"
          label="Gift code"
          placeholder="ABCDE-FGHJK"
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {redeem.isError && (
        <Alert variant="error">{redeem.error instanceof ApiClientError ? redeem.error.message : "Couldn't use that gift code."}</Alert>
      )}
      <Button type="submit" variant="secondary" isLoading={redeem.isPending}>
        Pay with gift
      </Button>
    </form>
  );
}
