import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useBooking } from "./hooks";
import { PaymentPanel } from "./PaymentPanel";
import { ConsentPanel } from "./ConsentPanel";
import { SessionPanel } from "./SessionPanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { CancelBookingButton } from "./CancelBookingButton";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { formatKES, formatTimeRange } from "../../lib/format";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError } = useBooking(id);

  if (isLoading) {
    return <PageSpinner label="Loading booking..." />;
  }

  if (isError || !data) {
    return <Alert variant="error">This booking could not be found.</Alert>;
  }

  const booking = data.booking;
  const isTherapist = user?.role === "THERAPIST";
  const isCancellable = booking.status === "PENDING_PAYMENT" || booking.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={isTherapist ? booking.clientName : booking.therapistName} action={<StatusBadge status={booking.status} />} />

      <Card>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-stone-500">Session time</dt>
          <dd className="text-stone-900">{formatTimeRange(booking.slot.startTime, booking.slot.endTime)}</dd>
          <dt className="text-stone-500">Fee</dt>
          <dd className="text-stone-900">{formatKES(booking.feeKES)}</dd>
        </dl>
        {isCancellable && (
          <div className="mt-4">
            <CancelBookingButton bookingId={booking.id} />
          </div>
        )}
      </Card>

      {!isTherapist && booking.status === "PENDING_PAYMENT" && <PaymentPanel booking={booking} />}

      {booking.status === "CONFIRMED" && !booking.hasConsented && !isTherapist && <ConsentPanel bookingId={booking.id} />}

      {booking.status === "CONFIRMED" && !booking.hasConsented && isTherapist && (
        <Alert variant="info">Waiting for the client to review and accept the consent terms before the session can be joined.</Alert>
      )}

      {booking.status === "CONFIRMED" && booking.hasConsented && <SessionPanel booking={booking} isTherapist={isTherapist} />}

      {!isTherapist && booking.status === "COMPLETED" && !booking.hasFeedback && <FeedbackPanel bookingId={booking.id} />}
    </div>
  );
}
