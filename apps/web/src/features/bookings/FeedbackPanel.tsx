import { useState, type FormEvent } from "react";
import { createFeedbackRequestSchema } from "@mind-hub/shared";
import { useSubmitFeedback } from "./hooks";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { TextareaField, SelectField } from "../../components/fields";
import { ApiClientError } from "../../api/client";

const RATINGS = [5, 4, 3, 2, 1];

export function FeedbackPanel({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submitFeedback = useSubmitFeedback(bookingId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createFeedbackRequestSchema.safeParse({ rating: Number(rating), comment: comment || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your feedback");
      return;
    }

    try {
      await submitFeedback.mutateAsync(parsed.data);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't submit feedback right now.");
    }
  }

  if (submitted) {
    return (
      <Card>
        <Alert variant="success">Thanks for letting us know how it went.</Alert>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-medium text-stone-900">How was your session?</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-3">
        <SelectField id="rating" label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}>
          {RATINGS.map((r) => (
            <option key={r} value={r}>
              {r} {r === 1 ? "star" : "stars"}
            </option>
          ))}
        </SelectField>

        <TextareaField
          id="comment"
          label="Anything you'd like to share? (optional)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" isLoading={submitFeedback.isPending}>
          Submit feedback
        </Button>
      </form>
    </Card>
  );
}
