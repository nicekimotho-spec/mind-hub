import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { CONCERN_TAGS, type ConcernTag } from "@mind-hub/shared";
import { useAuth } from "../auth/AuthContext";
import { LinkButton } from "../../components/LinkButton";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CompassIcon,
  GiftIcon,
  HeadsetIcon,
  LockIcon,
  MinusIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "../../components/icons";

const CONTAINER = "mx-auto max-w-5xl px-4 sm:px-6";

const CARD_LINK_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function directoryFor(tag: ConcernTag): string {
  return `/therapists?${new URLSearchParams({ specialty: tag })}`;
}

/** Where "Get matched" leads depends on who's looking: visitors need an account first,
 * clients go straight to the intake questionnaire, and staff roles have no intake. */
function useGetStartedPath(): string {
  const { user } = useAuth();
  if (!user) return "/register";
  return user.role === "CLIENT" ? "/intake" : "/dashboard";
}

/* Every claim on this page has to be true of the product as built — no invented user
   counts or features from later phases. The trust strip stands in for the
   "millions helped" counters other platforms lead with. */
const TRUST_POINTS: { icon: IconComponent; title: string; description: string }[] = [
  {
    icon: ShieldCheckIcon,
    title: "Verified therapists",
    description: "Licences and credentials are reviewed before anyone is listed.",
  },
  {
    icon: HeadsetIcon,
    title: "Video, audio or text chat",
    description: "Audio and text chat keep working on slower connections.",
  },
  {
    icon: PhoneIcon,
    title: "Pay with M-Pesa",
    description: "Pay per session, with reduced fees if you need them.",
  },
  {
    icon: LockIcon,
    title: "Never recorded",
    description: "Your sessions are never recorded, in any form.",
  },
];

const VERIFICATION_CHECKS = [
  "Academic qualifications",
  "Professional licence or registration",
  "Government-issued ID",
  "CV and professional references",
  "Professional indemnity cover",
];

const STEPS = [
  {
    title: "Tell us what's going on",
    description:
      "Answer a few short questions about what you'd like support with, how you'd like to meet, and when you're free.",
  },
  {
    title: "Choose your therapist",
    description:
      "We suggest up to five verified therapists who fit your needs, with their approach, languages and fees up front. You make the final choice.",
  },
  {
    title: "Book, pay and meet online",
    description:
      "Pick a time, pay with M-Pesa, and meet by video, audio or text chat from your browser. Message your therapist between sessions too.",
  },
];

type Availability = "yes" | "no" | "varies";

const COMPARISON_ROWS: { feature: string; mindHub: Availability; inPerson: Availability }[] = [
  { feature: "Licensed, verified therapists", mindHub: "yes", inPerson: "yes" },
  { feature: "Sessions by video, audio or text chat from home", mindHub: "yes", inPerson: "no" },
  { feature: "Message your therapist between sessions", mindHub: "yes", inPerson: "no" },
  { feature: "Works on slower connections", mindHub: "yes", inPerson: "no" },
  { feature: "No travel or waiting rooms", mindHub: "yes", inPerson: "no" },
  { feature: "Matched to therapists who fit your needs", mindHub: "yes", inPerson: "no" },
  { feature: "Journal, goals and worksheets between sessions", mindHub: "yes", inPerson: "varies" },
  { feature: "Fees shown before you book", mindHub: "yes", inPerson: "varies" },
  { feature: "Reduced fees if cost is a barrier", mindHub: "yes", inPerson: "varies" },
  { feature: "Pay with M-Pesa", mindHub: "yes", inPerson: "varies" },
  { feature: "Switch therapist whenever you like", mindHub: "yes", inPerson: "varies" },
  { feature: "Face-to-face in the same room", mindHub: "no", inPerson: "yes" },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Who are the therapists?",
    answer:
      "Licensed counsellors and psychologists. Before anyone is listed, our team reviews their academic qualifications, professional licence or registration, government ID, CV, references and professional indemnity cover. Only therapists who pass that review appear in search and matching.",
  },
  {
    question: "How does matching work?",
    answer:
      "You answer a short questionnaire about what you'd like support with, how you'd like to meet and when you're available. We use your answers to suggest up to five therapists whose specialties fit. It's a transparent, rules-based filter, not AI, and you always make the final choice. Prefer to look around first? You can browse every therapist in the directory.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Each therapist sets their own per-session fee, shown in Kenyan shillings on their profile before you book. You pay for each session when you book it, via M-Pesa. There's no subscription or monthly commitment.",
  },
  {
    question: "What if I can't afford the fee?",
    answer:
      "You can apply for reduced fees. It takes a couple of minutes, and only the Mind Hub team reviewing applications sees your answers. If you're approved, you pay the lower fee with any therapist who offers one, for six months.",
  },
  {
    question: "How do sessions work?",
    answer:
      "Sessions happen in your web browser, with no app to install. You can meet by video, by audio only, or by live text chat. Audio and text chat are there for when your connection is slow, or when you'd simply rather not be on camera. Sessions are never recorded.",
  },
  {
    question: "Can I message my therapist between sessions?",
    answer:
      "Yes. Once you've booked and paid for a session, you can send your therapist a private message at any time, and they'll reply when they're next working. Messages aren't monitored around the clock, so they're not for emergencies.",
  },
  {
    question: "Can I switch therapists?",
    answer:
      "Yes, at any time, and you don't need to explain why. Because you pay per session, you're never locked in: just book your next session with someone else.",
  },
  {
    question: "Is my information private?",
    answer:
      "Your sessions are never recorded, and what you share with your therapist is confidential within professional and legal limits. Those limits are explained in plain language before your first session. Your journal, goals and worksheets are visible only to you unless you choose to share an item. Access to your records is restricted to the people who need it, and every access is logged.",
  },
  {
    question: "Is Mind Hub right for me?",
    answer:
      "Mind Hub can help with stress and anxiety, relationship and family concerns, grief and life changes, workplace pressures, parenting, and personal growth. It isn't the right place if you're in crisis or need medication, which therapists can't prescribe. In those cases, please contact emergency services or a doctor.",
  },
  {
    question: "Can online therapy replace seeing someone in person?",
    answer:
      "For many people, yes: online sessions offer the same professional care without the commute. It isn't a substitute for emergency care or for treatment that needs medication, and if your therapist feels you'd be better supported elsewhere, they'll tell you and help you find that care.",
  },
  {
    question: "Can I give sessions as a gift?",
    answer:
      "Yes. Choose an amount, pay with M-Pesa, and we can text the person a gift code, or you can share it yourself. They can use it with any therapist on Mind Hub, one session at a time, for up to a year.",
  },
  {
    question: "What if I need help right now?",
    answer:
      "Mind Hub isn't an emergency service. If you or someone else is in immediate danger, call 999 or 112, or go to your nearest hospital emergency department.",
  },
];

function SectionIntro({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-semibold tracking-tight text-balance text-stone-900 sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-lg text-pretty text-stone-600">{description}</p>}
    </div>
  );
}

function CrisisNotice() {
  return (
    <div className="border-b border-accent-100 bg-accent-50">
      <p className={clsx(CONTAINER, "flex items-start gap-2 py-2.5 text-sm text-stone-700 sm:items-center")}>
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 sm:mt-0" />
        <span>
          In crisis, or worried someone may be in danger? Mind Hub isn&apos;t an emergency service. Call{" "}
          <strong className="font-semibold text-stone-900">999</strong> or{" "}
          <strong className="font-semibold text-stone-900">112</strong> now.
        </span>
      </p>
    </div>
  );
}

function SupportPathCard({
  icon: Icon,
  title,
  description,
  action,
  to,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  action: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={clsx(
        "group flex h-full flex-col items-center rounded-2xl border border-stone-200 bg-white px-6 py-7 text-center shadow-sm",
        "transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        CARD_LINK_FOCUS,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
        <Icon className="h-6 w-6" />
      </span>
      <span className="mt-4 text-lg font-semibold text-stone-900">{title}</span>
      <span className="mt-1 text-sm text-stone-500">{description}</span>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
        {action}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

function Hero({ getStartedPath, isSignedIn }: { getStartedPath: string; isSignedIn: boolean }) {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute top-10 -right-24 h-72 w-72 rounded-full bg-accent-100/70 blur-3xl" />
      </div>

      <div className={clsx(CONTAINER, "relative py-16 text-center sm:py-24")}>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100">
          <ShieldCheckIcon className="h-4 w-4" />
          Online counselling with licensed, verified therapists
        </p>
        <h1
          id="hero-heading"
          className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance text-stone-900 sm:text-5xl lg:text-6xl"
        >
          You don&apos;t have to figure everything out alone.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-stone-600">
          Talk to a qualified therapist by video, audio or text chat, from wherever you are in Kenya. Book in minutes and pay
          with M-Pesa.
        </p>

        <h2 className="mt-12 text-base font-medium text-stone-800">What kind of support are you looking for?</h2>
        <ul className="mx-auto mt-5 grid max-w-4xl gap-4 sm:grid-cols-3">
          <li>
            <SupportPathCard
              icon={UserIcon}
              title="Individual"
              description="For myself"
              action="See therapists"
              to={directoryFor("Individual counselling")}
            />
          </li>
          <li>
            <SupportPathCard
              icon={UsersIcon}
              title="Couples & family"
              description="For me and my partner or family"
              action="See therapists"
              to={directoryFor("Couples and family counselling")}
            />
          </li>
          <li>
            <SupportPathCard
              icon={CompassIcon}
              title="Not sure yet"
              description="Help me find the right fit"
              action="Get matched"
              to={getStartedPath}
            />
          </li>
        </ul>

        {!isSignedIn && (
          <p className="mt-8 text-sm text-stone-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section aria-labelledby="trust-heading" className="border-y border-stone-200 bg-white">
      <h2 id="trust-heading" className="sr-only">
        Why people choose Mind Hub
      </h2>
      <ul className={clsx(CONTAINER, "grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4")}>
        {TRUST_POINTS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-stone-900">{title}</p>
              <p className="mt-0.5 text-sm text-stone-500">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QualifiedTherapists({ getStartedPath }: { getStartedPath: string }) {
  return (
    <section aria-labelledby="therapists-heading" className="bg-stone-50 py-16 sm:py-24">
      <div className={clsx(CONTAINER, "grid items-center gap-10 lg:grid-cols-2 lg:gap-16")}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Who you&apos;ll talk to</p>
          <h2
            id="therapists-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-balance text-stone-900 sm:text-4xl"
          >
            Qualified therapists you can trust
          </h2>
          <p className="mt-4 leading-relaxed text-stone-600">
            Every therapist on Mind Hub is a licensed professional whose credentials our team has reviewed. They
            support people through a wide range of concerns, and you always choose who you work with.
          </p>

          <ul aria-label="Browse therapists by concern" className="mt-6 flex flex-wrap gap-2">
            {CONCERN_TAGS.map((tag) => (
              <li key={tag}>
                <Link
                  to={directoryFor(tag)}
                  className={clsx(
                    "inline-flex rounded-full border border-brand-100 bg-white px-3 py-1.5 text-sm text-brand-800",
                    "transition-colors hover:border-brand-300 hover:bg-brand-50",
                    CARD_LINK_FOCUS,
                  )}
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>

          <LinkButton to={getStartedPath} size="lg" className="mt-8">
            Get matched to a therapist
          </LinkButton>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <ShieldCheckIcon className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-semibold text-stone-900">Checked before they&apos;re listed</h3>
          </div>
          <p className="mt-3 text-sm text-stone-600">
            Our team reviews every therapist&apos;s documents before they can appear in search or matching:
          </p>
          <ul className="mt-5 space-y-3">
            {VERIFICATION_CHECKS.map((check) => (
              <li key={check} className="flex items-start gap-3 text-sm text-stone-700">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <CheckIcon className="h-3 w-3" strokeWidth={3} />
                </span>
                {check}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ getStartedPath }: { getStartedPath: string }) {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className={CONTAINER}>
        <SectionIntro
          id="how-heading"
          eyebrow="How it works"
          title="From first click to first session"
          description="Three steps, all online, at a pace that suits you."
        />

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-stone-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <LinkButton to={getStartedPath} size="lg">
            Get started
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function ComparisonCell({ value }: { value: Availability }) {
  if (value === "varies") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500">
        <MinusIcon className="h-4 w-4" />
        Varies
      </span>
    );
  }
  const isYes = value === "yes";
  const Icon = isYes ? CheckIcon : XIcon;
  return (
    <span
      className={clsx(
        "inline-flex h-7 w-7 items-center justify-center rounded-full",
        isYes ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-400",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={isYes ? 2.5 : 2} />
      <span className="sr-only">{isYes ? "Yes" : "No"}</span>
    </span>
  );
}

function Comparison() {
  return (
    <section id="compare" aria-labelledby="compare-heading" className="scroll-mt-20 bg-stone-50 py-16 sm:py-24">
      <div className={CONTAINER}>
        <SectionIntro
          id="compare-heading"
          eyebrow="Why online"
          title="Mind Hub vs. traditional in-person counselling"
          description="The same professional care, without the commute."
        />

        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Mind Hub compared with traditional in-person counselling</caption>
            <thead>
              <tr className="border-b border-stone-200">
                <th scope="col" className="px-4 py-4 sm:px-6">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="w-24 bg-brand-50 px-2 py-4 text-center font-semibold text-brand-800 sm:w-36">
                  Mind Hub
                </th>
                <th scope="col" className="w-24 px-2 py-4 text-center font-medium text-stone-600 sm:w-36">
                  In-person
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row" className="px-4 py-3.5 font-normal text-stone-700 sm:px-6">
                    {row.feature}
                  </th>
                  <td className="bg-brand-50/60 px-2 py-3.5 text-center">
                    <ComparisonCell value={row.mindHub} />
                  </td>
                  <td className="px-2 py-3.5 text-center">
                    <ComparisonCell value={row.inPerson} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className={CONTAINER}>
        <SectionIntro id="faq-heading" eyebrow="FAQ" title="Frequently asked questions" />

        {/* Native <details>/<summary> gives keyboard and screen-reader support for the
            accordion with no JS state to manage. */}
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary
                className={clsx(
                  "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-medium text-stone-900 sm:px-6",
                  "hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                  "[&::-webkit-details-marker]:hidden",
                )}
              >
                {faq.question}
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-stone-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-stone-600 sm:px-6">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForTherapists() {
  return (
    <section aria-labelledby="join-heading" className="bg-stone-50 py-16 sm:py-20">
      <div className={CONTAINER}>
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">For therapists</p>
            <h2 id="join-heading" className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              Are you a licensed therapist or counsellor?
            </h2>
            <p className="mt-3 text-stone-600">
              Reach clients across Kenya, set your own fees and availability, and run your sessions online.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
            <LinkButton to="/register?role=therapist" size="lg">
              Apply to join
            </LinkButton>
            <p className="text-sm text-stone-500">
              Already registered?{" "}
              <Link to="/login" className="font-medium text-brand-700 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function GiftSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section id="gifts" aria-labelledby="gift-heading" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className={clsx(CONTAINER, "grid items-center gap-10 md:grid-cols-2")}>
        <div aria-hidden="true" className="flex justify-center">
          <div className="relative flex h-44 w-44 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 shadow-sm">
            <GiftIcon className="h-20 w-20 text-brand-800" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Gift sessions</p>
          <h2 id="gift-heading" className="mt-2 text-3xl font-semibold tracking-tight text-balance text-stone-900 sm:text-4xl">
            Give the gift of support
          </h2>
          <p className="mt-4 leading-relaxed text-stone-600">
            Therapy is one of the most meaningful gifts you can give. Pay with M-Pesa, and we&apos;ll text the person their gift code, or you can
            share it yourself. They choose their own therapist.
          </p>
          <LinkButton to={isSignedIn ? "/gifts" : "/register"} size="lg" className="mt-6">
            Send a gift
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function ClosingCta({ getStartedPath }: { getStartedPath: string }) {
  return (
    <section aria-labelledby="cta-heading" className="bg-brand-800">
      <div className={clsx(CONTAINER, "py-16 text-center sm:py-20")}>
        <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
          Ready to talk to someone?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-brand-100">
          It only takes a few minutes to get started, and you&apos;ll see your matches before you pay anything.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <LinkButton to={getStartedPath} variant="secondary" size="lg">
            Get matched to a therapist
          </LinkButton>
          <Link
            to="/therapists"
            className="inline-flex items-center gap-1 font-medium text-white underline-offset-4 hover:underline"
          >
            Browse all therapists
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  const getStartedPath = useGetStartedPath();

  return (
    <>
      <CrisisNotice />
      <Hero getStartedPath={getStartedPath} isSignedIn={user !== null} />
      <TrustStrip />
      <QualifiedTherapists getStartedPath={getStartedPath} />
      <HowItWorks getStartedPath={getStartedPath} />
      <Comparison />
      <Faq />
      {!user && <ForTherapists />}
      <GiftSection isSignedIn={user !== null} />
      <ClosingCta getStartedPath={getStartedPath} />
    </>
  );
}
