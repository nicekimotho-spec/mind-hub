import clsx from "clsx";

/**
 * Shown right after a client writes something containing crisis language (the API's
 * lib/riskLanguage.ts). Like SafetyBlockedNotice, it references only Kenya's national
 * emergency numbers until a clinician has reviewed specific hotline referrals.
 */
export function CrisisAlert({ className }: { className?: string }) {
  return (
    <div role="alert" className={clsx("rounded-lg border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-stone-700", className)}>
      <p className="font-medium text-stone-900">It sounds like things might be really hard right now.</p>
      <p className="mt-1">
        Your therapist will see your message, but they may not be able to reply straight away. If you&apos;re in danger
        or thinking about ending your life, please call <strong className="text-stone-900">999</strong> or{" "}
        <strong className="text-stone-900">112</strong> now, or go to your nearest hospital emergency department.
      </p>
    </div>
  );
}
