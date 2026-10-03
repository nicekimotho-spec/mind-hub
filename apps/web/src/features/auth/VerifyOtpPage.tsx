import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyOtpRequestSchema } from "@mind-hub/shared";
import { verifyOtpRequest } from "./authApi";
import { ApiClientError } from "../../api/client";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { Card } from "../../components/Card";
import { TextField } from "../../components/fields";

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = verifyOtpRequestSchema.safeParse({ phone, code });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      await verifyOtpRequest(parsed.data);
      navigate("/login");
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Verify your phone number</h1>
        <p className="mt-2 text-sm text-stone-500">Enter the 6-digit code we sent you.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} aria-label="Verify OTP" noValidate className="space-y-4">
          <TextField
            id="phone"
            label="Phone number"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors["phone"]}
          />

          <TextField
            id="code"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={fieldErrors["code"]}
          />

          {formError && <Alert variant="error">{formError}</Alert>}

          <Button type="submit" isLoading={submitting} className="w-full">
            {submitting ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
