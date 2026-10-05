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
  const [photoUrl, setPhotoUrl] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [reducedFeeKES, setReducedFeeKES] = useState("");
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
    setPhotoUrl(profile.photoUrl ?? "");
    setYearsExperience(profile.yearsExperience === null ? "" : String(profile.yearsExperience));
    setRegistrationNumber(profile.registrationNumber ?? "");
    setReducedFeeKES(profile.reducedFeeKES === null ? "" : String(profile.reducedFeeKES));
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
      photoUrl: photoUrl.trim() || undefined,
      yearsExperience: yearsExperience === "" ? undefined : Number(yearsExperience),
      registrationNumber: registrationNumber.trim() || undefined,
      reducedFeeKES: reducedFeeKES === "" ? undefined : Number(reducedFeeKES),
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

        <TextField
          id="reducedFeeKES"
          label="Reduced fee per session (KES, optional)"
          type="number"
          min={1}
          hint="Offered to clients the Mind Hub team has approved for reduced fees. Leave blank if you don't offer one."
          value={reducedFeeKES}
          onChange={(e) => setReducedFeeKES(e.target.value)}
          error={fieldErrors["reducedFeeKES"]}
        />

        <TextField
          id="yearsExperience"
          label="Years of practice (optional)"
          type="number"
          min={0}
          max={60}
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          error={fieldErrors["yearsExperience"]}
        />

        <TextField
          id="registrationNumber"
          label="Professional registration number (optional)"
          hint="Shown on your public profile so clients can check it with your licensing board."
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          error={fieldErrors["registrationNumber"]}
        />

        <TextField
          id="photoUrl"
          label="Profile photo link (optional)"
          type="url"
          hint="A link to a professional headshot. Profiles with photos feel more approachable."
          placeholder="https://"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          error={fieldErrors["photoUrl"]}
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
