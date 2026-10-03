import { useEffect, useState, type FormEvent } from "react";
import { CONCERN_TAGS, CREDENTIAL_TYPES, addCredentialRequestSchema, updateTherapistProfileSchema } from "@mind-hub/shared";
import { useAddCredential, useMyTherapistProfile, useUpdateTherapistProfile } from "./hooks";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { StatusBadge } from "../../components/Badge";
import { PageSpinner } from "../../components/Spinner";
import { TextField, TextareaField, SelectField, CheckboxGroupField } from "../../components/fields";
import { zodErrorsToFieldMap } from "../../lib/zodErrors";
import { ApiClientError } from "../../api/client";
import { formatDateTime } from "../../lib/format";

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  ACADEMIC_CERTIFICATE: "Academic certificate",
  PROFESSIONAL_LICENSE: "Professional license",
  GOVERNMENT_ID: "Government ID",
  CV: "CV",
  PROFESSIONAL_INDEMNITY: "Professional indemnity",
  REFERENCE_LETTER: "Reference letter",
};

function ProfileForm() {
  const { data } = useMyTherapistProfile();
  const updateProfile = useUpdateTherapistProfile();
  const profile = data?.profile;

  const [bio, setBio] = useState("");
  const [approach, setApproach] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languagesInput, setLanguagesInput] = useState("");
  const [feeKES, setFeeKES] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setApproach(profile.approach ?? "");
    setSpecialties(profile.specialties);
    setLanguagesInput(profile.languages.join(", "));
    setFeeKES(String(profile.feeKES));
  }, [profile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaved(false);

    const languages = languagesInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed = updateTherapistProfileSchema.safeParse({
      bio: bio || undefined,
      approach: approach || undefined,
      specialties,
      languages,
      feeKES: Number(feeKES),
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldMap(parsed.error));
      return;
    }

    try {
      await updateProfile.mutateAsync(parsed.data);
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Couldn't save your profile right now.");
    }
  }

  if (!profile) {
    return <PageSpinner label="Loading your profile..." />;
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium text-stone-900">Profile</h2>
        <StatusBadge status={profile.status} />
      </div>

      {profile.status === "PENDING_VERIFICATION" && (
        <Alert variant="info" className="mb-4">
          Your profile is awaiting admin review. You won&apos;t appear in the public directory until it&apos;s verified.
        </Alert>
      )}
      {profile.status === "REJECTED" && (
        <Alert variant="error" className="mb-4">
          Your application was not approved. Please contact support for details.
        </Alert>
      )}
      {profile.status === "SUSPENDED" && (
        <Alert variant="error" className="mb-4">
          Your account has been suspended. Please contact support.
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextareaField id="bio" label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} error={fieldErrors["bio"]} />

        <TextField
          id="approach"
          label="Therapeutic approach (optional)"
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
          error={fieldErrors["approach"]}
        />

        <CheckboxGroupField
          legend="Specialties"
          name="specialties"
          options={CONCERN_TAGS}
          value={specialties}
          onChange={setSpecialties}
          error={fieldErrors["specialties"]}
          columns={2}
        />

        <TextField
          id="languages"
          label="Languages"
          hint="Comma-separated, e.g. English, Kiswahili"
          value={languagesInput}
          onChange={(e) => setLanguagesInput(e.target.value)}
          error={fieldErrors["languages"]}
        />

        <TextField
          id="feeKES"
          label="Fee per session (KES)"
          type="number"
          min={1}
          value={feeKES}
          onChange={(e) => setFeeKES(e.target.value)}
          error={fieldErrors["feeKES"]}
        />

        {formError && <Alert variant="error">{formError}</Alert>}
        {saved && <Alert variant="success">Profile saved.</Alert>}

        <Button type="submit" isLoading={updateProfile.isPending}>
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function CredentialsSection() {
  const { data } = useMyTherapistProfile();
  const addCredential = useAddCredential();
  const [type, setType] = useState<string>(CREDENTIAL_TYPES[0]);
  const [documentUrl, setDocumentUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = addCredentialRequestSchema.safeParse({ type, documentUrl });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    try {
      await addCredential.mutateAsync(parsed.data);
      setDocumentUrl("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't add that credential.");
    }
  }

  return (
    <Card className="mt-6">
      <h2 className="font-medium text-stone-900">Credentials</h2>
      <p className="mt-1 text-sm text-stone-500">Upload documentation for admin review — license, academic certificates, ID, and references.</p>

      {data && data.profile.credentials.length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.profile.credentials.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-stone-800">{CREDENTIAL_TYPE_LABELS[c.type] ?? c.type}</p>
                <p className="text-xs text-stone-400">Added {formatDateTime(c.createdAt)}</p>
              </div>
              <StatusBadge status={c.verified ? "VERIFIED" : "PENDING_VERIFICATION"} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <SelectField id="credentialType" label="Document type" value={type} onChange={(e) => setType(e.target.value)}>
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {CREDENTIAL_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="min-w-64 flex-1">
          <TextField
            id="documentUrl"
            label="Document URL"
            hint="Link to your uploaded document"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
          />
        </div>
        <Button type="submit" isLoading={addCredential.isPending}>
          Add
        </Button>
      </form>
      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function TherapistProfileEditPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My profile" description="Clients see this once you're verified and active." />
      <ProfileForm />
      <CredentialsSection />
    </div>
  );
}
