# Product Requirements Document: Mind Hub

**Status:** Draft v0.1
**Owner:** Gabriel
**Last updated:** 2026-09-16
**Product name:** Mind Hub (placeholder — repo name; confirm brand before public launch)

---

## 1. Executive Summary

Mind Hub is a digital mental-health and counselling ecosystem for Kenya, built around four pillars:

1. **Professional Therapy** — one-to-one, couples, and family counselling
2. **Accessible Support** — affordable digital access regardless of location
3. **Mental-Health Education** — evidence-based psychoeducation and prevention
4. **Workplace & Community Wellbeing** — programmes for organisations, families, and communities

The guiding design question is not "how do we build a video-call app," but:

> *What does a person need from the moment they realise they need psychological support until they are safely connected to appropriate care and their wellbeing improves?*

The platform is built as a **clinically governed health service first, and a software product second**. Every feature decision is subordinate to client safety, ethical practice, and regulatory compliance in Kenya.

---

## 2. Problem Statement

Individuals in Kenya face geographic, financial, social, and scheduling barriers to face-to-face counselling. Existing telehealth options are largely generic marketplaces without clinical governance, safeguarding pathways, or Kenya-specific regulatory grounding. Mind Hub addresses this gap by combining an accessible client experience with rigorous therapist credentialing, crisis escalation, and data protection built in from day one.

---

## 3. Goals & Non-Goals

### Goals (MVP)
- Let a client discover the service, get matched to a suitable therapist, book, consent, and attend a session online with minimal friction.
- Let a credentialed therapist manage availability, sessions, and minimal clinical notes securely.
- Give admins the tools to verify therapists and respond to a safety incident.
- Establish the legal/consent/data-handling foundation required to operate lawfully in Kenya before taking real clients.

### Non-Goals (MVP)
- No AI-driven diagnosis, risk scoring, or treatment planning.
- No group therapy, corporate programmes, or insurance integrations (Phase 4).
- No native mobile apps at launch (responsive web first).
- No session recording by default, in any phase.
- No multi-country expansion; Kenya-only for v1.

---

## 4. Target Users & Personas

| Persona | Description | Key needs |
|---|---|---|
| **Client** | Individual (or couple/family) seeking counselling; may be anxious about seeking help, price-sensitive, sometimes on low bandwidth | Low-friction discovery, trust signals, affordability, privacy, easy booking |
| **Therapist** | Licensed counsellor/psychologist providing sessions through the platform | Efficient scheduling, secure notes, fair payout, clear escalation tools |
| **Clinical Director / Supervisor** | Oversees clinical governance, supervision, incident review | Visibility into safeguarding events, therapist quality, complaints |
| **Platform Admin** | Non-clinical operations staff | Therapist onboarding/verification, payments, user management, reporting |
| **Corporate/Institutional Buyer** (Phase 4) | Employer, university, NGO, insurer | Bulk seats, reporting, invoicing |

---

## 5. Scope: MVP vs. Later Phases

A disciplined MVP ("walking skeleton") is intentionally smaller than the full feature set described in the original concept. Clinical notes, referral tooling, and multi-channel messaging are **deliberately deferred** past MVP so the first release can be validated in a small pilot before more surface area is added.

| Capability | MVP | Phase 2 | Phase 3+ |
|---|:---:|:---:|:---:|
| Client registration & profile | ✅ | | |
| Therapist directory + profiles | ✅ | | |
| Matching questionnaire (rules-based, not ML) | ✅ | | |
| Booking & calendar | ✅ | | |
| M-Pesa payment | ✅ | | |
| Informed consent capture | ✅ | | |
| Video session (via 3rd-party SDK) | ✅ | | |
| Audio-only session fallback | ✅ | | |
| Basic crisis/safeguarding workflow (manual, human-in-loop) | ✅ | | |
| Therapist verification workflow (admin, manual) | ✅ | | |
| Post-session feedback | ✅ | | |
| Secure clinical notes | | ✅ | |
| Secure in-app messaging | | ✅ | |
| Referral/escalation tooling (structured) | | ✅ | |
| Client dashboard (history, documents) | | ✅ | |
| Psychoeducation content library | | ✅ | |
| Group programmes | | | ✅ |
| Corporate/B2B portals | | | ✅ |
| Insurance/university partnerships | | | ✅ |
| Multilingual UI | | | ✅ |

---

## 6. Core User Journey

```
Discover → Understand → Assess → Match → Book → Consent → Attend → Follow-up → Continue/Refer
```

1. **Discover** — Client lands on the site; plain-language explanation of what counselling is, who it's for, pricing, confidentiality, and what happens in an emergency.
2. **Understand** — FAQs, therapist qualifications, how online counselling works.
3. **Assess** — Short intake form: presenting concern, preferred approach, availability, communication preference, basic safety screening. The system must be able to flag "not appropriate for online-only support" and redirect to emergency resources instead of allowing booking.
4. **Match** — Rules-based matching (not ML) returns 3–5 suitable therapists; client makes the final choice. Algorithm never makes clinical determinations.
5. **Book** — Client selects a therapist and slot; pays via M-Pesa.
6. **Consent** — Client explicitly consents (short-form, plain language) before first session: scope, confidentiality limits, data handling, cancellation, tech-failure and emergency procedures.
7. **Attend** — Video or audio session via secure, encrypted connection.
8. **Follow-up** — Post-session feedback; rebooking prompt.
9. **Continue/Refer** — Client continues with same therapist, switches therapist, or is referred out (e.g., to psychiatric care) if the platform is not appropriate for their needs.

---

## 7. Functional Requirements

Requirement IDs are prefixed by module for traceability (FR-CLI = client, FR-THX = therapist, FR-ADM = admin, FR-SAF = safeguarding).

### 7.1 Client-side

- **FR-CLI-01**: Client can register with email/phone, verify via OTP.
- **FR-CLI-02**: Client can browse therapist profiles filtered by presenting issue, language, age group, therapy type, availability, and budget.
- **FR-CLI-03**: Client completes an intake/matching questionnaire before being shown matches.
- **FR-CLI-04**: System applies a **safety-screening gate**: specific answers (e.g., active suicidal ideation, immediate danger) block self-service booking and instead surface emergency contacts/hotlines and a manual triage path.
- **FR-CLI-05**: Client can view 3–5 matched therapists with profile, qualifications, approach, fee, and availability.
- **FR-CLI-06**: Client can book an available slot and pay via M-Pesa (STK push).
- **FR-CLI-07**: Client must actively accept informed consent before the first session is unlocked; consent text is versioned and re-presented on material changes.
- **FR-CLI-08**: Client joins session via browser (no app install required) for video or audio.
- **FR-CLI-09**: Client can cancel/reschedule within a defined policy window.
- **FR-CLI-10**: Client submits post-session feedback (rating + optional free text).
- **FR-CLI-11**: Client can request to switch therapists or terminate therapy at any time without coercion.
- **FR-CLI-12**: Client can file a complaint through a visible, simple mechanism.

### 7.2 Therapist-side

- **FR-THX-01**: Therapist submits application with credentials (academic qualifications, professional registration/licensing, ID, CV, references, indemnity cover) — see §11 for Kenya-specific licensing.
- **FR-THX-02**: Therapist status is `pending_verification → verified → active` (or `rejected` / `suspended`); only `active` therapists appear in matching.
- **FR-THX-03**: Therapist manages an availability calendar.
- **FR-THX-04**: Therapist views and manages upcoming appointments.
- **FR-THX-05**: Therapist can view minimal necessary client intake info before a session (presenting concern, safety-screening flags), not full history in MVP.
- **FR-THX-06**: Therapist can mark a session as completed / no-show / cancelled.
- **FR-THX-07**: Therapist can trigger the safeguarding/crisis workflow (§7.4) during or after a session.
- **FR-THX-08**: Therapist accepts the Platform Therapist Agreement (conduct, confidentiality, documentation, boundaries, emergency procedures) as a gated step before activation.
- **FR-THX-09**: Therapist can view their own payout/billing summary.

### 7.3 Admin / Clinical Governance

- **FR-ADM-01**: Admin reviews and approves/rejects therapist applications with an audit trail.
- **FR-ADM-02**: Admin (or Clinical Director role) can view and manage safeguarding incidents.
- **FR-ADM-03**: Admin can view and respond to client complaints.
- **FR-ADM-04**: Admin can suspend/deactivate a therapist or client account.
- **FR-ADM-05**: System maintains an immutable audit log of access to clinical/PII data (who accessed what, when).
- **FR-ADM-06**: Admin can view basic operational reporting (bookings, completion rate, cancellations, revenue) — full outcome dashboard (§10) is Phase 2+.

### 7.4 Safeguarding & Crisis Workflow (MVP — manual, human-in-the-loop)

- **FR-SAF-01**: Intake and in-session flows include a defined escalation trigger (client-reported risk indicators, therapist-flagged concern).
- **FR-SAF-02**: On trigger, the system surfaces a documented escalation checklist to the therapist (safety assessment, local emergency contacts, supervisor notification) — the system supports the workflow, it does not automate the clinical decision.
- **FR-SAF-03**: Every escalation is logged with timestamp, action taken, and outcome, visible to the Clinical Director role.
- **FR-SAF-04**: Designated clinical supervisor receives a notification (SMS/email) when an incident is flagged as high severity.
- **FR-SAF-05**: This workflow must be authored/reviewed with a qualified clinical and legal professional before launch — **not something to design in code alone.**

### 7.5 Matching

- **FR-MAT-01**: Matching is a transparent, rules-based filter (tag/attribute matching), not a black-box ML model, for MVP and for the foreseeable roadmap unless a validated clinical case is made otherwise.
- **FR-MAT-02**: Matching never outputs a diagnosis, risk score, or treatment recommendation.

### 7.6 Consent

- **FR-CON-01**: Consent content is versioned; the version and timestamp accepted by each client is stored.
- **FR-CON-02**: Consent covers: what online counselling involves, benefits/limitations, confidentiality and its limits, data handling, fees, cancellation, tech-failure procedure, emergency procedure, legal disclosure circumstances, complaints, and termination rights.
- **FR-CON-03**: Consent is written in plain language, not a long legal document; a separate full Terms/Privacy Policy exists for legal completeness.

### 7.7 Sessions (Video/Audio)

- **FR-SES-01**: Sessions run over an encrypted, browser-based video/audio SDK (see §11 integrations).
- **FR-SES-02**: Sessions are **not recorded by default**. Recording, if ever implemented, requires a distinct consent flow and a specific clinical/legal justification — out of scope for MVP entirely.
- **FR-SES-03**: Sessions have an automatic idle/timeout safeguard.
- **FR-SES-04**: If a session drops, both parties see a reconnect path and a documented fallback (e.g., phone number) consistent with the consent-stage disclosure.

### 7.8 Payments

- **FR-PAY-01**: Primary payment rail is M-Pesa (Daraja API STK Push) for the Kenyan market.
- **FR-PAY-02**: Card payment (e.g., via a Kenya-compliant PSP) as a secondary option.
- **FR-PAY-03**: Payment must be confirmed before a session slot is finalized; failed/pending payments release the slot after a timeout.
- **FR-PAY-04**: Therapist payout tracking (manual reconciliation acceptable for MVP; automated payout is Phase 2+).

---

## 8. Non-Functional Requirements

### 8.1 Security & Privacy

- **NFR-SEC-01**: TLS in transit for all traffic; encryption at rest for PII and clinical data.
- **NFR-SEC-02**: Role-based access control — client, therapist, admin, clinical director scopes are enforced server-side, not just hidden in the UI.
- **NFR-SEC-03**: Strong authentication (min. password policy + OTP for sensitive actions); consider MFA for therapist/admin roles at launch.
- **NFR-SEC-04**: All access to clinical/PII records is audit-logged (see FR-ADM-05).
- **NFR-SEC-05**: Automatic session (application, not therapy-session) timeouts on inactivity.
- **NFR-SEC-06**: Secure, tested backups with a documented restore procedure.
- **NFR-SEC-07**: Basic vulnerability testing before launch (dependency scanning at minimum; a proper external pentest before scaling beyond pilot).
- **NFR-SEC-08**: Documented incident-response procedure, including a data-breach notification process aligned to Kenya's Data Protection Act, 2019.

### 8.2 Compliance (Kenya) — see §11 for detail

- **NFR-CMP-01**: Data Protection Act, 2019 compliance, including registration with the Office of the Data Protection Commissioner (ODPC) where applicable and a Data Protection Impact Assessment (DPIA) given the sensitivity of health data.
- **NFR-CMP-02**: Alignment with the Digital Health Act, 2023 requirements for digital health information systems.
- **NFR-CMP-03**: Only therapists licensed/registered under applicable Kenyan professional bodies (see §11) are onboarded.
- **NFR-CMP-04**: Child-safeguarding procedures where any service is offered to minors, including parental/guardian consent handling.
- **NFR-CMP-05**: A Kenyan health-law/privacy specialist reviews the platform before any commercial (non-pilot) launch. **This is a hard gate, not a nice-to-have.**

### 8.3 Performance & Availability

- **NFR-PERF-01**: Core pages (discover, booking) usable on low-bandwidth connections; audio-only session path exists specifically for bandwidth-constrained users.
- **NFR-PERF-02**: Target 99.5% uptime for booking/session infrastructure post-pilot (relaxed during pilot phase, but tracked).

### 8.4 Accessibility

- **NFR-ACC-01**: WCAG 2.1 AA as a target for core client-facing flows.
- **NFR-ACC-02**: Interface tone is warm, private, and simple — not a "hospital portal" (design principle, not just a requirement).

---

## 9. Data Model Overview (indicative, not final schema)

| Entity | Key attributes |
|---|---|
| `User` | id, role, contact info, auth credentials, status |
| `ClientProfile` | user_id, demographic info (minimal), preferences |
| `TherapistProfile` | user_id, credentials, verification_status, specialties, languages, approach, fee |
| `IntakeAssessment` | client_id, presenting_concern, safety_screening_answers, risk_flag |
| `MatchResult` | client_id, therapist_ids[], match_criteria_snapshot |
| `Booking` | client_id, therapist_id, slot, status, payment_id |
| `ConsentRecord` | client_id, consent_version, accepted_at |
| `Session` | booking_id, channel(video/audio), start/end, status |
| `Payment` | booking_id, provider(mpesa/card), amount, status, reference |
| `SafeguardingIncident` | client_id, therapist_id, trigger, actions_taken[], severity, supervisor_notified_at, outcome |
| `Complaint` | user_id, description, status, resolution |
| `AuditLogEntry` | actor_id, action, resource, timestamp |

All entities containing health/PII data must be covered by the encryption-at-rest and access-control requirements in §8.1.

---

## 10. Success Metrics (post-pilot, informing Phase 2+)

Grouped per the original concept's outcome dashboard:

- **Access**: average wait time, cost per session, geographic/underserved reach
- **Engagement**: booking-to-attendance rate, sessions completed, therapist-client retention
- **Client experience**: satisfaction, ease of booking, privacy confidence
- **Clinical quality**: referral rate, incident rate, complaint rate, treatment completion
- **Equity**: access across socioeconomic groups, language accessibility

Success is *not* measured by registered-user count alone.

---

## 11. Kenya Regulatory & Legal Considerations

This section names the specific instruments the original concept referenced only generically. **Legal review by a Kenyan health-law/privacy specialist is required before commercial launch — the below is a planning checklist, not legal advice.**

- **Digital Health Act, 2023** — governs digital health information systems and telehealth in Kenya; likely the primary health-tech-specific statute applicable to session delivery, health records handling, and possibly registration obligations for digital health providers.
- **Data Protection Act, 2019** — health data is "sensitive personal data" under the Act; likely requires a Data Protection Impact Assessment, a registered Data Protection Officer, ODPC registration as a data controller/processor, and lawful-basis + explicit-consent handling for clinical data.
- **Counsellors and Psychologists Act, 2014** — governs licensing of counsellors and psychologists in Kenya; therapist onboarding (FR-THX-01) must verify registration against the applicable professional board.
- **Consumer Protection Act, 2012** — applies to fee transparency, cancellation terms, and consumer complaints handling.
- **Children Act, 2022** — applies if the platform serves minors; parental consent and heightened safeguarding are required.
- **Kenya Information and Communications Act / electronic transactions rules** — applies to electronic consent and payment record-keeping.
- **Cross-border data considerations** — if hosting or any sub-processor is outside Kenya, review the Data Protection Act's cross-border transfer conditions.

**Recommendation:** treat §11 as an open item for legal counsel, and do not open the pilot to real clients (even a small vetted group) until at minimum the Data Protection Act and Counsellors and Psychologists Act items are resolved.

---

## 12. Integrations

| Integration | Purpose | MVP? |
|---|---|---|
| M-Pesa Daraja API | Primary payment rail | ✅ |
| Video/audio SDK (e.g., Daily.co, Agora, Twilio Video — to be evaluated) | Session delivery | ✅ |
| SMS/OTP provider (e.g., Africa's Talking) | Auth, notifications, supervisor alerts | ✅ |
| Email provider | Transactional email | ✅ |
| ID verification (manual for MVP; automated later) | Therapist credentialing | Manual only |
| Card PSP (Kenya-compliant) | Secondary payment | Phase 2 |

---

## 13. Ethics & Client Rights Charter (summary — full version to be a standalone published document)

- Client autonomy — informed decisions about their own care
- Confidentiality within professional/legal limits
- Non-discrimination
- Professional boundaries maintained by therapists
- Therapists work within their competence/training
- Fee, service, and limitation transparency
- Informed choice of therapist, including the right to switch
- Transparent complaints mechanism
- Right to terminate therapy without coercion

---

## 14. Open Questions / Risks

1. **Legal sign-off dependency** — MVP cannot take real clients until the Kenya regulatory review (§11) is complete. This is the single biggest schedule risk.
2. **Therapist supply** — cold-start problem: need a critical mass of verified therapists before client-side demand is meaningful.
3. **Crisis workflow ownership** — who is the actual on-call Clinical Director/supervisor for pilot? This is an operational hire/partnership, not just a feature.
4. **Video/audio vendor choice** — needs evaluation on cost, HIPAA/GDPR-equivalent posture, and Kenya bandwidth performance.
5. **Branding** — "Mind Hub" is currently just the repo name; confirm before any public-facing copy is finalized.
6. **Minors policy** — decide whether youth/young-adult support is in scope for pilot (original concept lists it but flags it needs "appropriate safeguards" — this likely pushes it to Phase 2+ given the added Children Act burden).

---

## 15. Roadmap

| Phase | Timeline | Focus |
|---|---|---|
| 1 — Foundation | 0–3 months | Target population & clinical scope definition, legal/regulatory assessment, ethical framework, clinical policies, clinical leadership recruitment, client journey mapping, MVP design |
| 2 — MVP Build | 3–6 months | Booking, payments (M-Pesa), video/audio, consent, basic records, safeguarding workflow |
| 3 — Pilot | 6–9 months | Small vetted therapist/client group; measure access, safety, satisfaction, clinical quality, technical performance |
| 4 — Scale | 9–18 months | Corporate programmes, group counselling, psychoeducation, employer/university/insurance partnerships, multilingual support, expanded therapist network |

---

## 16. Appendix: Revenue Model (reference)

- **B2C**: individual/couples/family therapy fees
- **B2B**: employee assistance programmes, corporate counselling, workplace wellbeing (Phase 4)
- **B2B2C**: insurers, universities, NGOs, churches, healthcare providers, employers (Phase 4)
- **Education**: courses, webinars, parenting/relationship programmes (Phase 2+)
- **Cross-subsidy model**: standard-fee clients help subsidise reduced-fee/sponsored sessions, sustaining the social-impact mission without relying solely on donor funding.
