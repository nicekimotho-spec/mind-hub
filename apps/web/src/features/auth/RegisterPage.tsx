import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { registerRequestSchema } from "@mind-hub/shared";
import { registerRequest } from "./authApi";
import { ApiClientError } from "../../api/client";

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"CLIENT" | "THERAPIST">("CLIENT");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerRequestSchema.safeParse({
      role,
      fullName,
      phone,
      email: email || undefined,
      password,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors");
      return;
    }

    setSubmitting(true);
    try {
      await registerRequest(parsed.data);
      navigate(`/verify-otp?phone=${encodeURIComponent(parsed.data.phone)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>You don&apos;t have to figure everything out alone.</h1>
      <p>Connect with a qualified counsellor from wherever you are.</p>

      <form onSubmit={handleSubmit} aria-label="Register">
        <label htmlFor="role">I am a</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value as "CLIENT" | "THERAPIST")}>
          <option value="CLIENT">Client looking for support</option>
          <option value="THERAPIST">Therapist / counsellor</option>
        </select>

        <label htmlFor="fullName">Full name</label>
        <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712345678"
          required
        />

        <label htmlFor="email">Email (optional)</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" style={{ color: "crimson" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
