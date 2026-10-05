# Mind Hub vs. BetterHelp: Gap Analysis

**Status:** v1.1
**Last updated:** 2026-10-05
**Related:** [PRD.md](PRD.md), [BUILD_PLAN.md](BUILD_PLAN.md)

This compares Mind Hub with [BetterHelp](https://www.betterhelp.com/), the largest online therapy service, to decide which of its features are worth adopting for the Kenyan market and which to avoid. Several items are scoped as Phase 2 or later in PRD §5. The product owner has now asked for them to be built, so this document is the record of that scope change.

---

## 1. Feature comparison

| Area | BetterHelp | Mind Hub (before this work) |
|---|---|---|
| Matching | Long questionnaire; a therapist is assigned within 2–18 hours | Short intake; up to 5 rules-based matches shown immediately; client chooses |
| Ways to meet | Messaging, live chat, phone, video | Video and audio-only |
| Messaging between sessions | Unlimited, asynchronous: the core of the product | None |
| Switching therapist | One click, optional reason, 3 new suggestions | Client can book someone else; no guided flow |
| Therapist profiles | Photo, licence, years of experience, client reviews | Name, bio, specialties, languages, approach, fee |
| Ratings | Shown on profiles | Collected after each session, never shown |
| Self-help tools | 150+ worksheets, journaling, goal tracking | None |
| Group sessions | 20+ live "groupinars" a week | None (PRD Phase 3) |
| Pricing | Subscription, US$70–100/week, billed every 4 weeks | Pay per session via M-Pesa; each therapist sets the fee |
| Financial aid | Income-based sliding scale | None (PRD §16 cross-subsidy model, not built) |
| Gifting | Gift a membership | None |
| Reminders | Mobile app notifications | None |
| Business / EAP | BetterHelp for Business | None (PRD Phase 4) |
| Crisis handling | "Don't use this site" banner with resources | Intake safety gate; 999/112 notices |

**Where Mind Hub is already ahead:**
- **Instant matches.** BetterHelp makes people wait hours for an assignment.
- **Pay-per-session M-Pesa pricing.** This fits a price-sensitive market better than a weekly subscription.
- **Audio-only sessions.** They work on slow connections.

## 2. Recommendations, by priority

| # | Feature | Why |
|---|---|---|
| 1 | **SMS session reminders** | Cheap, and reduces no-shows. Africa's Talking is already the planned SMS provider (PRD §12). |
| 2 | **Secure messaging between sessions** | BetterHelp's core feature. Text works on slow connections, which suits Kenya even better than video. Needs a crisis notice and clear reply-time expectations. |
| 3 | **One-click "switch therapist"** | Already a requirement (FR-CLI-11). Asking for a reason gives the team quality signals. |
| 4 | **Richer profiles and visible ratings** | Cheap trust signals. Show an average only once a therapist has enough ratings that no single client's rating can be singled out. |
| 5 | **Journal, goals and worksheets** | Engagement between sessions. Worksheet content must be reviewed by a clinician. |
| 6 | **Reduced-fee programme** | Delivers the PRD §16 cross-subsidy model. |
| 7 | **Live text-chat sessions** | The lowest-bandwidth session type, added alongside video and audio. |
| 8 | **Gift sessions** | Fits Kenyans abroad paying for family at home. M-Pesa now; card payments come with PRD FR-PAY-02. |
| 9 | Group sessions, business plans | PRD Phase 3–4. Not started. |

## 3. What not to copy

- **Sharing health data for advertising.** In 2023 the FTC fined BetterHelp US$7.8M and banned it from sharing health data for advertising. It had sent email addresses, IP addresses and intake answers to Facebook, Snapchat and others. Health data is "sensitive personal data" under Kenya's Data Protection Act, 2019. **Recommendation:** no third-party marketing pixels on intake, booking, messaging or journal pages, and an explicit commitment in the privacy policy. That policy wording is a decision for the product owner and legal counsel.
- **Made-up stats on the landing page.** Our landing page lists only facts that are true of the product.
- **A long signup questionnaire.** Reviewers found BetterHelp's ~20-minute onboarding tedious. Keep intake short.
- **Subscription auto-billing.** Pay-per-session is clearer and suits M-Pesa.
- **Teen therapy.** Wait until the Children Act, 2022 review is done (PRD §14.6).

## 4. Implementation status

All built on 2026-10-05, each with a migration, shared Zod schemas, API module, integration tests and UI. Every item was also checked end to end in a browser against the real API and database.

| # | Feature | Status | Where | Notes |
|---|---|---|---|---|
| — | Landing page redesign | Done | `apps/web/src/features/landing/` | Section order follows BetterHelp. The trust strip, comparison table, FAQ and gift section describe only what is built |
| 1 | SMS session reminders | Done | `apps/api/src/lib/sms.ts`, `modules/notifications/` | Reminders a day and an hour before each session; one opt-out switch. Texts never name the therapist or say "therapy". Stub mode logs texts until Africa's Talking credentials are set |
| 2 | Secure messaging | Done | `modules/careTeam/`, `modules/messages/` | Only between a client and therapist who share a paid booking. One SMS alert per burst. The inbox list carries no message text. Thread views are audit-logged once per 30 minutes rather than on every poll |
| 3 | Switch-therapist flow | Done | `modules/matching/` | Excludes the current therapist and anyone switched away from before. The reason is never shown to the therapist |
| 4 | Richer profiles and ratings | Done | `modules/therapists/` | Average shown only from 5 ratings up (`MIN_RATINGS_TO_DISPLAY`); comments are never published |
| 5 | Journal, goals, worksheets | Done | `modules/toolkit/`, `packages/shared/src/worksheets.ts` | Private by default; each item can be shared with one therapist on the care team. Therapists can assign worksheets |
| 6 | Reduced-fee programme | Done | `modules/feeAssistance/` | Therapist-funded sliding scale. Approvals last 6 months. The fee is fixed on the booking when it is made |
| 7 | Live text-chat sessions | Done | `modules/sessions/` | `CHAT` channel; the transcript also appears in the messages thread |
| 8 | Gift sessions | Done | `modules/gifts/` | M-Pesa only, no card yet (FR-PAY-02). Each redemption must cover the whole session fee. The balance is decremented with a guarded update so a code can't be double-spent |
| 9 | Group sessions, business plans | Not started | | PRD Phase 3–4 |

### Needs a decision or review before launch

- **Clinical review:** the six worksheets (`worksheets.ts`) and the crisis-phrase list (`apps/api/src/lib/riskLanguage.ts`) are drafts. Both are marked as such in code, in the same way as the intake safety screen (FR-SAF-05).
- **Consent text:** consent version 1 describes sessions "over video or audio" and doesn't mention messaging or text chat. A new version needs legal review, and publishing it will ask every client to re-consent (FR-CLI-07).
- **Privacy policy:** a written commitment never to use health data for advertising (see §3).
- **Auth rate limit (existing issue):** `/auth/refresh` shares the login limiter of 30 requests per 15 minutes per IP, and every page load calls it. Users behind shared IPs (mobile carrier NAT, offices, campuses) could lock each other out. Consider a separate, higher limit for refresh.

## 5. Sources

- [BetterHelp homepage](https://www.betterhelp.com/)
- [BetterHelp: Online Therapy](https://www.betterhelp.com/online-therapy/)
- [Healthline: BetterHelp review](https://www.healthline.com/health/mental-health/betterhelp-review)
- [HelpGuide: BetterHelp review](https://www.helpguide.org/mental-health/treatment/betterhelp-review)
- [FTC: final order banning BetterHelp from sharing health data for advertising (2023)](https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising)
- [Healthcare Dive: FTC fines BetterHelp US$7.8M](https://www.healthcaredive.com/news/ftc-betterhelp-settlement-health-data-sharing-fine/644021/)
