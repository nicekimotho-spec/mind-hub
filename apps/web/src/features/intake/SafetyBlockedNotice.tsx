import { Card } from "../../components/Card";

/**
 * Shown instead of self-service matching when an intake is flagged blockedBooking=true
 * (BUILD_PLAN.md §8.3). Deliberately references only Kenya's official national
 * emergency numbers (999 / 112) rather than a specific crisis hotline — a wrong or
 * outdated hotline number in a genuine crisis flow is a real harm risk, and unlike the
 * screening logic itself, this copy has NOT been reviewed by a clinician (see PRD §14,
 * §11) so it stays deliberately minimal until that review happens.
 */
export function SafetyBlockedNotice() {
  return (
    <Card className="border-accent-100 bg-accent-50">
      <h2 className="text-lg font-semibold text-stone-900">Thank you for being honest with us</h2>
      <p className="mt-2 text-sm text-stone-700">
        Based on your answers, we want to connect you with immediate support rather than self-service booking — this
        platform isn&apos;t able to respond quickly enough for what you&apos;re describing.
      </p>
      <p className="mt-3 text-sm font-medium text-stone-900">
        If you are in immediate danger, please call <span className="font-semibold">999</span> or{" "}
        <span className="font-semibold">112</span> right now, or go to your nearest hospital emergency department.
      </p>
      <p className="mt-3 text-sm text-stone-700">
        You don&apos;t have to go through this alone, and reaching out again later — when you&apos;re ready — is always okay.
      </p>
    </Card>
  );
}
