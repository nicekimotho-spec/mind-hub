import { useCurrentConsentVersion } from "../consent/hooks";
import { useConsentToBooking } from "./hooks";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { PageSpinner } from "../../components/Spinner";
import { ApiClientError } from "../../api/client";

export function ConsentPanel({ bookingId }: { bookingId: string }) {
  const { data, isLoading, isError } = useCurrentConsentVersion();
  const consentToBooking = useConsentToBooking(bookingId);

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Informed consent</h2>
      <p className="mt-1 text-sm text-stone-500">Please review and accept before your session.</p>

      {isLoading && <PageSpinner label="Loading consent terms..." />}
      {isError && <Alert variant="error">Couldn&apos;t load the consent terms right now.</Alert>}

      {data && (
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
          {data.consentVersion.content}
        </div>
      )}

      {consentToBooking.isError && (
        <Alert variant="error" className="mt-3">
          {consentToBooking.error instanceof ApiClientError ? consentToBooking.error.message : "Couldn't record your consent. Please try again."}
        </Alert>
      )}

      <Button className="mt-4" isLoading={consentToBooking.isPending} disabled={!data} onClick={() => consentToBooking.mutate()}>
        I have read and agree
      </Button>
    </Card>
  );
}
