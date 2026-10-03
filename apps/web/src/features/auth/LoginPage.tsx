import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginRequestSchema } from "@mind-hub/shared";
import { useAuth } from "./AuthContext";
import { ApiClientError } from "../../api/client";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { Card } from "../../components/Card";
import { TextField } from "../../components/fields";

/** Only redirects to a same-origin relative path — a bare "?next=" query param is
 * attacker-controlled, so anything else (an absolute URL, a protocol-relative "//"
 * URL) is rejected rather than followed, to avoid an open-redirect after login. */
function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginRequestSchema.safeParse({ phone, password });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      await login(parsed.data.phone, parsed.data.password);
      navigate(safeNextPath(searchParams.get("next")));
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-center text-2xl font-semibold text-stone-900">Welcome back</h1>

      <Card>
        <form onSubmit={handleSubmit} aria-label="Login" noValidate className="space-y-4">
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
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors["password"]}
          />

          {formError && <Alert variant="error">{formError}</Alert>}

          <Button type="submit" isLoading={submitting} className="w-full">
            {submitting ? "Logging in..." : "Log in"}
          </Button>

          <p className="text-center text-sm text-stone-500">
            New here?{" "}
            <Link to="/register" className="font-medium text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
