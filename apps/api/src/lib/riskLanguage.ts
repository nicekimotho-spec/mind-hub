/**
 * A crude keyword screen for crisis language in client messages — NOT a clinical risk
 * assessment, and a placeholder in the same sense as the intake safety screen
 * (packages/shared/src/intake.ts, PRD FR-SAF-05): the phrase list needs review by a
 * qualified clinician before real clients rely on it.
 *
 * It never blocks, alters or delays a message. A match only (a) shows the sender
 * emergency numbers and (b) highlights the message for the therapist. False positives
 * cost one extra notice; false negatives are expected, which is why the crisis notice
 * is also always visible in every conversation.
 */
const RISK_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)? my ?self\b/i,
  /\bend (my life|it all)\b/i,
  /\b(want|wanna|going) to die\b/i,
  /\bself[- ]?harm/i,
  /\b(hurt|hurting|cut|cutting) myself\b/i,
  /\boverdose\b/i,
  /\bno reason to live\b/i,
  // Kiswahili: "to kill oneself", "I want to die".
  /\bkujiua\b/i,
  /\bnataka kufa\b/i,
];

export function containsRiskLanguage(text: string): boolean {
  return RISK_PATTERNS.some((pattern) => pattern.test(text));
}
