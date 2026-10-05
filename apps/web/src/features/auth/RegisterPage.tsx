import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerRequestSchema } from "@mind-hub/shared";
import { registerRequest } from "./authApi";
import { ApiClientError } from "../../api/client";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { Card } from "../../components/Card";
import { TextField, SelectField } from "../../components/fields";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // "Apply to join" links arrive with ?role=therapist so therapists don't have to find the role picker.
  const [role, setRole] = useState<"CLIENT" | "THERAPIST">(searchParams.get("role") === "therapist" ? "THERAPIST" : "CLIENT");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = registerRequestSchema.safeParse({
      role,
      fullName,
      phone,
      email: email || undefined,
      password,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      await registerRequest(parsed.data);
      navigate(`/verify-otp?phone=${encodeURIComponent(parsed.data.phone)}`);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        {role === "THERAPIST" ? (
          <>
            <h1 className="text-2xl font-semibold text-stone-900">Join Mind Hub as a therapist</h1>
            <p className="mt-2 text-sm text-stone-500">
              Create your account, then add your credentials for our team to review.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-stone-900">You don&apos;t have to figure everything out alone.</h1>
            <p className="mt-2 text-sm text-stone-500">Connect with a qualified counsellor from wherever you are.</p>
          </>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit} aria-label="Register" noValidate className="space-y-4">
          <SelectField id="role" label="I am a" value={role} onChange={(e) => setRole(e.target.value as "CLIENT" | "THERAPIST")}>
            <option value="CLIENT">Client looking for support</option>
            <option value="THERAPIST">Therapist / counsellor</option>
          </SelectField>

          <TextField
            id="fullName"
            label="Full name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors["fullName"]}
          />

          <TextField
            id="phone"
            label="Phone number"
            type="tel"
            autoComplete="tel"
            placeholder="0712345678"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors["phone"]}
          />

          <TextField
            id="email"
            label="Email (optional)"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors["email"]}
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 10 characters, with a mix of letters and numbers."
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors["password"]}
          />

          {formError && <Alert variant="error">{formError}</Alert>}

          <Button type="submit" isLoading={submitting} className="w-full">
            {submitting ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-stone-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
