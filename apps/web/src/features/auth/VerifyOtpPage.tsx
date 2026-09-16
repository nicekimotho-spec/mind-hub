import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyOtpRequestSchema } from "@mind-hub/shared";
import { verifyOtpRequest } from "./authApi";
import { ApiClientError } from "../../api/client";

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = verifyOtpRequestSchema.safeParse({ phone, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors");
      return;
    }

    setSubmitting(true);
    try {
      await verifyOtpRequest(parsed.data);
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Verify your phone number</h1>
      <p>Enter the 6-digit code we sent you.</p>

      <form onSubmit={handleSubmit} aria-label="Verify OTP">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <label htmlFor="code">Verification code</label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          required
        />

        {error && (
          <p role="alert" style={{ color: "crimson" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Verifying..." : "Verify"}
        </button>
      </form>
    </main>
  );
}
