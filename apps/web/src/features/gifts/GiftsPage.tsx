import { useState, type FormEvent } from "react";
import {
  GIFT_AMOUNT_PRESETS,
  GIFT_VALIDITY_MONTHS,
  purchaseGiftRequestSchema,
  type GiftVoucherResponse,
} from "@mind-hub/shared";
import { useMyGifts, usePurchaseGift } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { RadioGroupField, TextField, TextareaField } from "../../components/fields";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { ApiClientError } from "../../api/client";
import { formatKES } from "../../lib/format";

type AmountChoice = `${(typeof GIFT_AMOUNT_PRESETS)[number]}` | "OTHER";
const AMOUNT_CHOICES = [...GIFT_AMOUNT_PRESETS.map((a) => `${a}` as AmountChoice), "OTHER"] as const satisfies readonly AmountChoice[];
const AMOUNT_LABELS = Object.fromEntries(
  AMOUNT_CHOICES.map((choice) => [choice, choice === "OTHER" ? "Another amount" : formatKES(Number(choice))]),
) as Record<AmountChoice, string>;

const dateFormatter = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" });

function PurchaseForm() {
  const purchase = usePurchaseGift();
  const [amountChoice, setAmountChoice] = useState<AmountChoice>("5000");
  const [otherAmount, setOtherAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // One key per purchase attempt: a double-tap or a retry after a network blip reuses
  // it, so the API returns the same gift instead of prompting M-Pesa twice.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const parsed = purchaseGiftRequestSchema.safeParse({
      amountKES: amountChoice === "OTHER" ? Number(otherAmount) : Number(amountChoice),
      recipientName: recipientName.trim() || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
      message: message.trim() || undefined,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }
    try {
      await purchase.mutateAsync({ input: parsed.data, idempotencyKey });
      setIdempotencyKey(crypto.randomUUID());
      setRecipientName("");
      setRecipientPhone("");
      setMessage("");
    } catch {
      // Surfaced below via purchase.isError; the key is kept so a retry is safe.
    }
  }

  return (
    <Card>
      <h2 className="font-medium text-stone-900">Send a gift</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-5">
        <RadioGroupField
          legend="Gift amount"
          hint="Each therapist sets their own fee per session; you can see fees in the therapist directory."
          name="amount"
          options={AMOUNT_CHOICES}
          labels={AMOUNT_LABELS}
          value={amountChoice}
          onChange={setAmountChoice}
        />
        {amountChoice === "OTHER" && (
          <div className="sm:max-w-xs">
            <TextField
              id="otherAmount"
              label="Amount (KES)"
              type="number"
              min={500}
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
              error={fieldErrors["amountKES"]}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="recipientName"
            label="Their name (optional)"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            error={fieldErrors["recipientName"]}
          />
          <TextField
            id="recipientPhone"
            label="Their phone number (optional)"
            type="tel"
            placeholder="0712345678"
            hint="We'll text them the code once your payment goes through. Or leave this blank and share it yourself."
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            error={fieldErrors["recipientPhone"]}
          />
        </div>
        <TextareaField
          id="giftMessage"
          label="A short message (optional)"
          hint="Included in the text message we send them."
          rows={2}
          maxLength={300}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {purchase.isError && (
          <Alert variant="error">{purchase.error instanceof ApiClientError ? purchase.error.message : "Couldn't start the payment."}</Alert>
        )}
        <Button type="submit" isLoading={purchase.isPending}>
          Pay with M-Pesa
        </Button>
        <p className="text-xs text-stone-500">
          You&apos;ll get an M-Pesa prompt on your phone. Gifts last {GIFT_VALIDITY_MONTHS} months and can be used with any therapist on Mind
          Hub, one session at a time.
        </p>
      </form>
    </Card>
  );
}

function GiftCard({ gift }: { gift: GiftVoucherResponse }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-stone-900">
            {formatKES(gift.amountKES)}
            {gift.recipientName && <span className="font-normal text-stone-500"> for {gift.recipientName}</span>}
          </p>
          {gift.status !== "PENDING_PAYMENT" && gift.status !== "PAYMENT_FAILED" && (
            <p className="text-xs text-stone-500">
              {formatKES(gift.balanceKES)} left · use by {dateFormatter.format(new Date(gift.expiresAt))}
            </p>
          )}
        </div>
        <StatusBadge status={gift.status} />
      </div>
      {gift.status === "PENDING_PAYMENT" && (
        <Alert variant="info" className="mt-3">
          Check your phone for the M-Pesa prompt and enter your PIN. The gift code will appear here once it&apos;s paid.
        </Alert>
      )}
      {gift.status === "PAYMENT_FAILED" && (
        <p className="mt-2 text-sm text-stone-600">That payment didn&apos;t go through, so no gift was created. You can try again above.</p>
      )}
      {gift.code && gift.status === "ACTIVE" && (
        <div className="mt-3 rounded-lg bg-brand-50 px-4 py-3">
          <p className="text-xs text-brand-800">
            {gift.recipientPhone ? "We've texted this code to them. You can also share it yourself:" : "Share this code with them:"}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-brand-900">{gift.code}</p>
        </div>
      )}
    </Card>
  );
}

export function GiftsPage() {
  const { data, isLoading } = useMyGifts();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Gift sessions"
        description="Give someone you care about the gift of support. They can use it with any therapist on Mind Hub."
      />
      <PurchaseForm />
      {isLoading && <PageSpinner label="Loading your gifts..." />}
      {data && data.gifts.length > 0 && (
        <section aria-labelledby="my-gifts-heading" className="space-y-3">
          <h2 id="my-gifts-heading" className="font-medium text-stone-900">
            Gifts you&apos;ve sent
          </h2>
          {data.gifts.map((gift) => (
            <GiftCard key={gift.id} gift={gift} />
          ))}
        </section>
      )}
    </div>
  );
}
