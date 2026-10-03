import { Link } from "react-router-dom";
import { LinkButton } from "../../components/LinkButton";
import { Card } from "../../components/Card";

const PILLARS = [
  {
    title: "Professional therapy",
    description: "One-to-one, couples, and family counselling with licensed, verified therapists.",
  },
  {
    title: "Accessible support",
    description: "Affordable digital access regardless of location, with audio-only sessions where bandwidth is limited.",
  },
  {
    title: "Mental-health education",
    description: "Evidence-based psychoeducation to help you understand what you're going through.",
  },
  {
    title: "Workplace & community wellbeing",
    description: "Programmes designed for organisations, families, and communities.",
  },
];

export function LandingPage() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
        You don&apos;t have to figure everything out alone.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
        Connect with a qualified, verified counsellor from wherever you are — video or audio, on your schedule.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <LinkButton to="/therapists" size="lg">
          Find a therapist
        </LinkButton>
        <LinkButton to="/register" variant="secondary" size="lg">
          Create an account
        </LinkButton>
      </div>

      <div className="mt-16 grid gap-4 text-left sm:grid-cols-2">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title}>
            <h2 className="font-medium text-stone-900">{pillar.title}</h2>
            <p className="mt-1 text-sm text-stone-500">{pillar.description}</p>
          </Card>
        ))}
      </div>

      <p className="mt-16 text-sm text-stone-500">
        Already registered as a therapist?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>{" "}
        to manage your profile and sessions.
      </p>
    </div>
  );
}
