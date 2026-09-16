import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequestSchema } from "@mind-hub/shared";
import { useAuth } from "./AuthContext";
import { ApiClientError } from "../../api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginRequestSchema.safeParse({ phone, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form for errors");
      return;
    }

    setSubmitting(true);
    try {
      await login(parsed.data.phone, parsed.data.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Welcome back</h1>

      <form onSubmit={handleSubmit} aria-label="Login">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />

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
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
