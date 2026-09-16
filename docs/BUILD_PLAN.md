# Mind Hub — MVP Build Plan (Phase 1 + Phase 2)

**Status:** Draft v0.1
**Companion doc:** [PRD.md](./PRD.md) — this plan implements PRD §5 (MVP scope), §7 (functional requirements), §9 (data model), §11 (Kenya compliance), §12 (integrations).
**Tech stack:** React (TypeScript) frontend · Node.js + TypeScript backend · PostgreSQL

---

## 1. Guiding Principles for This Build

1. **Server-side is the source of truth for every safety/authorization decision.** The UI may hide a button; only the API may permit or deny an action. This applies especially to the safety-screening gate (FR-CLI-04) and RBAC — never trust a client-supplied role or a "the UI already checked" assumption.
2. **Every state transition that touches money, a booking slot, or a safeguarding incident must be safe under concurrency.** These are the places real platforms break (double-booked slots, double-charged clients, lost incident reports). Section 8 enumerates the specific guardrails and required tests.
3. **Tests are part of the definition of done, not a follow-up task.** Each milestone in §10 lists required tests before it can be marked complete.
4. **No feature ships past what PRD §5 scopes for MVP.** Clinical notes, in-app messaging, and referral tooling are explicitly Phase 3 — resist scope creep during Phase 2 build.

---

## 2. Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   React SPA (web)   │◄──────►│   Node.js + TS API    │◄──────►│   PostgreSQL     │
│  Vite + TS + Router  │  REST  │  Express + TS         │  SQL   │  (Prisma ORM)    │
│  TanStack Query      │  JSON  │  Zod validation        │        └─────────────────┘
│  React Hook Form     │        │  JWT auth + RBAC       │
└─────────────────────┘        │  BullMQ (Redis) jobs   │        ┌─────────────────┐
                                └──────────┬─────────────┘        │     Redis        │
                                           │                       │ (jobs, sessions)│
                    ┌──────────────────────┼──────────────────────┴─────────────────┘
                    ▼                      ▼                      ▼
          ┌──────────────┐      ┌──────────────────┐   ┌──────────────────────┐
          │ M-Pesa Daraja│      │ Video/Audio SDK   │   │ SMS/OTP (Africa's    │
          │ (payments)   │      │ (Daily.co/Twilio) │   │ Talking) + Email     │
          └──────────────┘      └──────────────────┘   └──────────────────────┘
```

**Why these choices:**
- **Express + TypeScript** over a heavier framework (NestJS) — smaller surface area for a small team to reason about; RBAC and audit logging are implemented as explicit middleware (visible, testable) rather than framework magic.
- **Prisma** — type-safe queries that match PostgreSQL schema 1:1, first-class migrations, and its query API makes the concurrency-safe patterns in §8 easy to express correctly (transactions, unique constraints, `SELECT ... FOR UPDATE` via `$queryRaw` where needed).
- **Zod schemas shared between frontend and backend** (in a `packages/shared` workspace) — the same validation rules run in the browser (fast feedback) and on the server (source of truth), eliminating an entire class of "frontend validated it, backend didn't" bugs.
- **BullMQ + Redis** — reliable background jobs for the things that must happen even if no user is watching: releasing an unpaid booking slot after a timeout, sending supervisor escalation alerts, retrying failed SMS/email.

---

## 3. Monorepo Structure

```
mind-hub/
├── apps/
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── features/    # one folder per PRD module: auth, booking, matching, consent, sessions, safeguarding, admin
│   │   │   ├── components/  # shared UI primitives
│   │   │   ├── api/         # generated/typed API client using shared Zod schemas
│   │   │   ├── routes/
│   │   │   └── test/        # test utils, MSW handlers
│   │   └── vite.config.ts
│   └── api/                  # Node.js + TS backend
│       ├── src/
│       │   ├── modules/      # one folder per module, mirrors PRD FR groups
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── therapists/
│       │   │   ├── intake/
│       │   │   ├── matching/
│       │   │   ├── booking/
│       │   │   ├── payments/
│       │   │   ├── consent/
│       │   │   ├── sessions/
│       │   │   ├── safeguarding/
│       │   │   ├── complaints/
│       │   │   └── admin/
│       │   ├── middleware/   # auth, rbac, auditLog, errorHandler, rateLimit
│       │   ├── jobs/         # BullMQ workers
│       │   ├── lib/          # db client, sms client, mpesa client, video client
│       │   └── app.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── test/
│           ├── integration/  # supertest, real test DB
│           └── unit/
├── packages/
│   └── shared/                # Zod schemas + TS types shared by web & api
├── infra/
│   ├── docker-compose.yml     # postgres, redis, api, web for local dev
│   └── github-actions/
├── docs/
│   ├── PRD.md
│   └── BUILD_PLAN.md          # this file
└── package.json                # workspaces root
```

---

## 4. Database Schema (Prisma) — MVP Entities

This is the concrete implementation of PRD §9, with the constraints that prevent the logical flaws called out in §8.

```prisma
enum UserRole { CLIENT THERAPIST ADMIN CLINICAL_DIRECTOR }
enum UserStatus { ACTIVE SUSPENDED DEACTIVATED }
enum TherapistStatus { PENDING_VERIFICATION VERIFIED ACTIVE REJECTED SUSPENDED }
enum RiskLevel { NONE LOW ELEVATED CRITICAL }
enum BookingStatus { PENDING_PAYMENT CONFIRMED CANCELLED COMPLETED NO_SHOW }
enum PaymentProvider { MPESA CARD }
enum PaymentStatus { INITIATED PENDING SUCCEEDED FAILED REFUNDED }
enum SessionChannel { VIDEO AUDIO }
enum SessionStatus { SCHEDULED IN_PROGRESS COMPLETED CANCELLED TECH_FAILURE }
enum IncidentSeverity { LOW MEDIUM HIGH CRITICAL }
enum ComplaintStatus { OPEN IN_REVIEW RESOLVED CLOSED }

model User {
  id           String     @id @default(uuid())
  email        String?    @unique
  phone        String     @unique
  passwordHash String
  role         UserRole
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  clientProfile    ClientProfile?
  therapistProfile TherapistProfile?
  auditLogs        AuditLogEntry[] @relation("actor")
}

model ClientProfile {
  userId             String   @id
  user               User     @relation(fields: [userId], references: [id])
  preferredLanguage  String   @default("en")
  dateOfBirth        DateTime?
  isMinor            Boolean  @default(false) // drives Children Act consent path
  guardianContact    String?  // required if isMinor
}

model TherapistProfile {
  userId       String          @id
  user         User            @relation(fields: [userId], references: [id])
  status       TherapistStatus @default(PENDING_VERIFICATION)
  bio          String?
  specialties  String[]
  languages    String[]
  approach     String?
  feeKES       Int
  verifiedAt   DateTime?
  verifiedById String?

  credentials  TherapistCredential[]
  slots        AvailabilitySlot[]
}

model TherapistCredential {
  id            String   @id @default(uuid())
  therapistId   String
  therapist     TherapistProfile @relation(fields: [therapistId], references: [userId])
  type          String   // e.g. "KCPA_LICENSE", "ACADEMIC_CERT", "ID"
  documentUrl   String
  verified      Boolean  @default(false)
  verifiedById  String?
  verifiedAt    DateTime?
  createdAt     DateTime @default(now())
}

model IntakeAssessment {
  id                 String    @id @default(uuid())
  clientId           String
  presentingConcern  String
  preferredApproach  String?
  availability       Json
  safetyAnswers      Json      // raw screening answers, retained for audit
  riskLevel          RiskLevel
  blockedBooking     Boolean   @default(false) // true => routed to emergency resources, not self-service booking
  createdAt          DateTime  @default(now())

  matchResult MatchResult?
}

model MatchResult {
  id                String   @id @default(uuid())
  intakeId          String   @unique
  intake            IntakeAssessment @relation(fields: [intakeId], references: [id])
  therapistIds      String[]
  criteriaSnapshot  Json
  createdAt         DateTime @default(now())
}

model AvailabilitySlot {
  id           String   @id @default(uuid())
  therapistId  String
  therapist    TherapistProfile @relation(fields: [therapistId], references: [userId])
  startTime    DateTime
  endTime      DateTime
  isBooked     Boolean  @default(false)

  booking      Booking?

  @@unique([therapistId, startTime]) // a therapist cannot have two slots at the same start time
}

model Booking {
  id          String        @id @default(uuid())
  clientId    String
  therapistId String
  slotId      String        @unique  // enforces exactly one booking per slot at the DB level
  slot        AvailabilitySlot @relation(fields: [slotId], references: [id])
  status      BookingStatus @default(PENDING_PAYMENT)
  createdAt   DateTime      @default(now())
  expiresAt   DateTime      // PENDING_PAYMENT bookings auto-release after this (see job in §8.2)

  payment     Payment?
  session     Session?
  consent     ConsentRecord?
}

model ConsentVersion {
  id            String   @id @default(uuid())
  version       Int      @unique
  content       String
  effectiveAt   DateTime
}

model ConsentRecord {
  id                String   @id @default(uuid())
  bookingId         String   @unique
  booking           Booking  @relation(fields: [bookingId], references: [id])
  clientId          String
  consentVersionId  String
  acceptedAt        DateTime @default(now())
}

model Payment {
  id               String         @id @default(uuid())
  bookingId        String         @unique
  booking          Booking        @relation(fields: [bookingId], references: [id])
  provider         PaymentProvider
  amountKES        Int
  status           PaymentStatus  @default(INITIATED)
  providerReference String?       @unique // M-Pesa CheckoutRequestID / card charge id
  idempotencyKey   String         @unique
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model Session {
  id          String        @id @default(uuid())
  bookingId   String        @unique
  booking     Booking       @relation(fields: [bookingId], references: [id])
  channel     SessionChannel
  status      SessionStatus @default(SCHEDULED)
  roomToken   String?
  startedAt   DateTime?
  endedAt     DateTime?

  incidents   SafeguardingIncident[]
}

model SafeguardingIncident {
  id                   String           @id @default(uuid())
  clientId             String
  therapistId          String
  sessionId            String?
  session              Session?         @relation(fields: [sessionId], references: [id])
  triggeredBy          String           // userId of therapist/admin who raised it, or "system"
  severity             IncidentSeverity
  actionsTaken         Json
  supervisorNotifiedAt DateTime?
  outcome              String?
  createdAt            DateTime         @default(now())
}

model Complaint {
  id          String          @id @default(uuid())
  userId      String
  description String
  status      ComplaintStatus @default(OPEN)
  resolution  String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model AuditLogEntry {
  id           String   @id @default(uuid())
  actorId      String?
  actor        User?    @relation("actor", fields: [actorId], references: [id])
  action       String   // e.g. "booking.create", "clinical_record.view"
  resourceType String
  resourceId   String
  metadata     Json?
  createdAt    DateTime @default(now())
}
```

**Constraints doing real work here** (these directly implement §8's guardrails):
- `AvailabilitySlot @@unique([therapistId, startTime])` + `Booking.slotId @unique` — makes double-booking a database-level impossibility, not just an application-level check.
- `Payment.idempotencyKey @unique` and `Payment.providerReference @unique` — makes duplicate payment processing (e.g., a retried M-Pesa callback) a no-op instead of a double charge.
- `ConsentRecord.bookingId @unique` — a session cannot be joined without exactly one consent record tied to that specific booking (see §8.4).

---

## 5. API Design (MVP endpoints)

All endpoints are versioned under `/api/v1`. Every row marked "Auth" requires a valid JWT; "Role" is enforced server-side by RBAC middleware (§6), never inferred from the request body.

| Module | Method & Path | Role | Notes |
|---|---|---|---|
| Auth | `POST /auth/register` | Public | Rate-limited; creates `User` + `ClientProfile` or `TherapistProfile` per `role` param |
| Auth | `POST /auth/verify-otp` | Public | Verifies phone via OTP before account is usable |
| Auth | `POST /auth/login` | Public | Returns access + refresh JWT |
| Auth | `POST /auth/refresh` | Public (refresh token) | Rotates refresh token |
| Auth | `POST /auth/logout` | Auth | Revokes refresh token |
| Users | `GET /users/me` | Auth | Own profile only |
| Therapists | `POST /therapists/apply` | Auth (THERAPIST, pending) | Uploads credentials |
| Therapists | `GET /therapists` | Public | Only `status=ACTIVE`, filterable by specialty/language/fee |
| Therapists | `GET /therapists/:id` | Public | Only if `ACTIVE`, else 404 (don't leak pending/rejected applicants) |
| Therapists (admin) | `GET /admin/therapists?status=PENDING_VERIFICATION` | Role: ADMIN | Review queue |
| Therapists (admin) | `POST /admin/therapists/:id/verify` | Role: ADMIN | Transitions status; audit-logged |
| Therapists (admin) | `POST /admin/therapists/:id/reject` \| `/suspend` | Role: ADMIN | Audit-logged |
| Intake | `POST /intake` | Auth (CLIENT) | Runs safety-screening logic server-side; may set `blockedBooking=true` |
| Matching | `POST /matching/:intakeId` | Auth (CLIENT, owns intake) | 400 if `intake.blockedBooking === true` — cannot be bypassed from the client |
| Availability | `GET /therapists/:id/slots?from=&to=` | Public | Only unbooked, future slots |
| Availability | `POST /therapists/me/slots` | Role: THERAPIST | Create own availability |
| Booking | `POST /bookings` | Auth (CLIENT) | Wrapped in a DB transaction (§8.2); sets `expiresAt` |
| Booking | `POST /bookings/:id/cancel` | Auth (owner CLIENT or THERAPIST) | Enforces cancellation-policy window |
| Payments | `POST /payments/mpesa/initiate` | Auth (CLIENT, owns booking) | Requires `Idempotency-Key` header |
| Payments | `POST /payments/mpesa/callback` | Public (M-Pesa server, IP/signature-restricted) | Idempotent by `providerReference` (§8.2) |
| Consent | `GET /consent/current-version` | Public | Latest `ConsentVersion` |
| Consent | `POST /bookings/:id/consent` | Auth (CLIENT, owns booking) | Required before session join is permitted (§8.4) |
| Sessions | `POST /bookings/:id/session/join-token` | Auth (owner CLIENT or THERAPIST) | 403 unless: booking `CONFIRMED`, consent recorded, within join time-window (§8.5) |
| Sessions | `POST /sessions/:id/complete` | Role: THERAPIST (session owner) | Marks completed/no-show |
| Safeguarding | `POST /safeguarding/incidents` | Role: THERAPIST, ADMIN, CLINICAL_DIRECTOR | Triggers supervisor notification job for HIGH/CRITICAL |
| Safeguarding | `GET /safeguarding/incidents` | Role: CLINICAL_DIRECTOR, ADMIN | |
| Complaints | `POST /complaints` | Auth | |
| Complaints (admin) | `GET/PATCH /admin/complaints/:id` | Role: ADMIN | |
| Feedback | `POST /bookings/:id/feedback` | Auth (CLIENT, owns booking, status COMPLETED) | |
| Admin reporting | `GET /admin/reports/overview` | Role: ADMIN | Bookings, completion rate, cancellations, revenue |

---

## 6. Auth & RBAC Design

- **JWT access token** (short-lived, ~15 min) carries `userId` and `role`. **Role is re-read from the database on every RBAC check for high-sensitivity actions** (verify therapist, view incidents, view another user's data) rather than trusted purely from the token, so a role downgrade/suspension takes effect immediately rather than waiting for token expiry.
- **Refresh token** (long-lived, rotated on use, stored hashed in DB) for session continuity.
- **RBAC middleware** — `requireRole(...roles)` — rejects with 403 before the route handler runs. Ownership checks (e.g., "this booking belongs to this client") are a second, explicit check inside the handler — never conflate "authenticated" with "authorized for this resource."
- **Audit logging middleware** wraps every mutating request to clinical/PII resources (booking, consent, intake, safeguarding, therapist verification) and writes an `AuditLogEntry` after the handler succeeds, per FR-ADM-05 / NFR-SEC-04.
- **Rate limiting** on `/auth/*` and `/payments/*` to blunt credential-stuffing and payment-abuse attempts.

---

## 7. Background Jobs (BullMQ)

| Job | Trigger | Purpose |
|---|---|---|
| `release-expired-booking` | Scheduled sweep (every 1 min) | Any `Booking` with `status=PENDING_PAYMENT` and `expiresAt < now()` is transitioned to `CANCELLED` and its `AvailabilitySlot.isBooked` reset to `false` — closes the "client abandoned checkout, slot locked forever" hole |
| `notify-supervisor` | `SafeguardingIncident` created with severity HIGH/CRITICAL | SMS + email to on-call Clinical Director; retries with backoff; escalates to a secondary contact if unacknowledged within N minutes |
| `send-otp` / `send-notification` | Auth, booking confirmations, reminders | Retries with backoff; failures logged, not silently dropped |
| `session-reminder` | T-1hr before a `CONFIRMED` booking | SMS/email reminder to client and therapist |

---

## 8. Concurrency, Payment, and Safety Guardrails

This section exists specifically to satisfy "avoid errors or logical flaws" — it enumerates the failure modes that are easy to miss and states the required mitigation and required test for each.

### 8.1 Double-booking a slot
- **Risk:** two clients hit "book" on the same slot within milliseconds of each other.
- **Mitigation:** `POST /bookings` runs inside a single DB transaction: `SELECT ... FOR UPDATE` the target `AvailabilitySlot`, verify `isBooked=false`, set `isBooked=true`, insert `Booking`. The `Booking.slotId @unique` constraint is the last-line guarantee even if the row lock is somehow bypassed.
- **Required test:** integration test that fires two concurrent `POST /bookings` requests at the same slot and asserts exactly one succeeds (201) and one fails (409).

### 8.2 Payment race conditions & duplicate charges
- **Risk:** M-Pesa callback arrives twice (common with STK push); client double-taps "pay."
- **Mitigation:** `POST /payments/mpesa/initiate` requires a client-generated `Idempotency-Key`; `POST /payments/mpesa/callback` upserts on `providerReference` — a second callback with the same reference is a no-op, not a second `SUCCEEDED` transition. Unpaid bookings expire via the `release-expired-booking` job (§7), never left in limbo indefinitely.
- **Required test:** unit test replaying the same M-Pesa callback payload twice and asserting the booking is confirmed exactly once and no duplicate `Payment` row is created.

### 8.3 Safety-screening gate bypass
- **Risk:** a client whose intake was flagged `blockedBooking=true` calls `POST /matching/:intakeId` or `POST /bookings` directly (skipping the UI), or resubmits intake with different answers to get a different result.
- **Mitigation:** `blockedBooking` is computed and stored server-side at intake time and checked again server-side at both matching and booking steps — never trusted from client input. Resubmission creates a new `IntakeAssessment` row (audit trail preserved) rather than mutating the old one.
- **Required test:** attempt to call `/matching` and `/bookings` directly with an intake known to be `blockedBooking=true` and assert both are rejected (400) regardless of what the client sends.

### 8.4 Session join without consent
- **Risk:** a client joins a video session without ever completing informed consent (e.g., by guessing/reusing a session URL).
- **Mitigation:** `POST /bookings/:id/session/join-token` checks for the existence of a `ConsentRecord` tied to that exact `bookingId` before issuing a token; the `ConsentRecord.bookingId @unique` constraint means consent from one booking can never be reused for another.
- **Required test:** attempt to fetch a join token for a `CONFIRMED` booking with no consent record and assert 403; assert 200 only after `POST /bookings/:id/consent` succeeds.

### 8.5 Session join authorization & time-window
- **Risk:** a therapist or client joins the wrong session, or joins arbitrarily early/late in a way that leaks the video room to someone else.
- **Mitigation:** join-token issuance checks `userId` is either `booking.clientId` or `booking.therapistId`, `booking.status === CONFIRMED`, and current time is within a defined window (e.g., 10 min before start to session end). Room tokens are single-purpose and short-lived (issued by the video SDK per session, not a static shareable link).
- **Required test:** cases for wrong user, wrong booking status, and outside time-window each return 403.

### 8.6 Cross-tenant data leakage
- **Risk:** an ID-guessing attack against `GET /bookings/:id` or `GET /safeguarding/incidents/:id` returns another user's data.
- **Mitigation:** every resource-by-id handler filters by owner (or role) in the query itself (`WHERE id = ? AND (client_id = ? OR therapist_id = ?)`), not by fetching then checking in application code after the fact.
- **Required test:** authenticated as User A, attempt to fetch User B's booking/incident by id and assert 404 (not 403, to avoid confirming the resource exists).

### 8.7 Timezone handling
- **Risk:** booking a "9am" slot means different things depending on where the request originates; East Africa Time (UTC+3) vs. client-device timezone bugs are a classic source of missed sessions.
- **Mitigation:** all timestamps stored in UTC in PostgreSQL (`timestamptz`); frontend converts to/from `Africa/Nairobi` (or device timezone) only at render/input time using a single shared date utility, never ad hoc `Date` math scattered across components.
- **Required test:** booking created from a client explicitly set to a non-Nairobi timezone still lands on the correct UTC slot server-side.

### 8.8 Minor / child-safeguarding path
- **Risk:** a client under 18 registers and books without the required guardian-consent handling (PRD §11, Children Act 2022).
- **Mitigation:** `ClientProfile.isMinor` derived from date of birth at registration; if true, `POST /bookings/:id/consent` requires `guardianContact` to be present and a distinct guardian-consent flag before confirming. This path should be built but **kept behind a feature flag, off for the pilot**, per PRD §14 open question #6, until the clinical/legal workstream confirms minors are in scope.
- **Required test:** minor client flow rejects consent completion without guardian consent captured.

---

## 9. Testing Strategy

### 9.1 Test pyramid & tooling

| Layer | Tool | Scope |
|---|---|---|
| Unit (backend) | Jest | Pure functions: safety-screening scoring, matching filter logic, date/timezone utils, RBAC helper functions |
| Integration (backend) | Jest + Supertest + a real PostgreSQL test database (via Docker/Testcontainers) | Every API endpoint in §5, including the concurrency/idempotency cases in §8 |
| Unit/component (frontend) | Vitest + React Testing Library | Forms (intake, consent, booking), gated UI states (blocked booking, no-consent state) |
| API mocking (frontend) | MSW (Mock Service Worker) | Frontend tests run against mocked API contracts generated from the shared Zod schemas, so contract drift fails the build |
| E2E | Playwright | Full golden-path flows end to end against a running stack (see §9.3) |
| Migration safety | Prisma migrate diff in CI | Fails CI if a migration would be destructive without an explicit override flag |

### 9.2 Required test coverage by module (minimum, enforced in CI)

| Module | Minimum coverage focus |
|---|---|
| Auth / RBAC | 100% of role-check branches; brute-force/rate-limit behavior |
| Intake / safety screening | Every risk-level branch; blocked-booking enforcement (§8.3) |
| Booking | Concurrency test (§8.1); cancellation policy edge cases; expiry job (§8.2) |
| Payments | Idempotency (§8.2); failure/timeout paths; amount-mismatch rejection |
| Consent | Version mismatch handling; gate enforcement (§8.4) |
| Sessions | Join authorization matrix (§8.5) |
| Safeguarding | Incident creation → notification job triggering (mock SMS/email transport, assert job enqueued with correct payload) |
| Audit logging | Assert a log entry is written for every mutating action on a protected resource |

### 9.3 Golden-path E2E scenarios (Playwright, run against a seeded staging-like environment)

1. Client registers → completes intake (non-blocked) → gets matched → books a slot → pays (M-Pesa sandbox) → completes consent → joins a session → submits feedback.
2. Client registers → completes intake with a risk-flagged answer → is blocked from self-service booking and shown emergency resources (never reaches the booking screen).
3. Therapist applies → admin reviews and verifies → therapist appears in matching results → therapist manages availability and completes a session.
4. Therapist raises a safeguarding incident mid-session → Clinical Director sees it in the incident queue → outcome is recorded.
5. Client attempts to join a session before consent is recorded → is blocked and redirected to the consent step.

### 9.4 CI Gates (GitHub Actions)

Every PR must pass, in order: `typecheck` → `lint` → `unit tests` → `integration tests` (against ephemeral Postgres service container) → `build`. E2E suite runs on merge to `main` and nightly. No merge to `main` without green CI; no `--no-verify` bypasses.

---

## 10. Milestone Breakdown

### Phase 1 — Engineering Foundation (parallel to the legal/clinical workstream in PRD §15 Phase 1)

*Non-engineering Phase 1 items (regulatory review, clinical policy authorship, clinical leadership recruitment) run in parallel and are tracked in the PRD, not here. This is the engineering-only slice.*

| # | Deliverable | Definition of Done |
|---|---|---|
| F1 | Monorepo scaffold (§3), lint/format/typecheck config, CI pipeline skeleton | `pnpm test` runs (even with zero tests) in CI on a PR |
| F2 | Docker Compose local dev stack (Postgres, Redis, api, web) | `docker compose up` gives a working local environment from a clean clone |
| F3 | Prisma schema (§4) + initial migration | `prisma migrate dev` succeeds; ERD reviewed against PRD §9 |
| F4 | Shared Zod schema package wired into both apps | A schema change in `packages/shared` breaks the build in both apps if consumers aren't updated (proves the wiring works) |
| F5 | Auth module (register, OTP verify, login, refresh, logout) + RBAC middleware | Full test suite per §9.2 "Auth/RBAC" row passing |
| F6 | Design system baseline (Tailwind tokens, base components) matching PRD §8.4 tone ("warm, private, simple") | Storybook (or equivalent) with core components |

### Phase 2 — MVP Build

Each milestone below implements one or more PRD §7 functional-requirement groups and is not "done" until its listed tests are green.

| # | Milestone | Implements | Required tests before done |
|---|---|---|---|
| M1 | Therapist onboarding & admin verification | FR-THX-01/02, FR-ADM-01 | Application submission, admin approve/reject/suspend transitions, audit log entries written |
| M2 | Intake & safety screening | FR-CLI-03/04 | Every risk-level branch (§9.2); blocked-booking cannot be bypassed (§8.3) |
| M3 | Matching | FR-MAT-01/02, FR-CLI-05 | Returns 3–5 active therapists only; rejects blocked intakes |
| M4 | Availability & booking | FR-CLI-06, FR-THX-03/04 | Concurrency test (§8.1); cancellation-window enforcement; expiry job (§8.2) |
| M5 | Payments (M-Pesa) | FR-PAY-01/03/04 | Idempotency test (§8.2); sandbox STK push success/failure/timeout paths |
| M6 | Consent | FR-CLI-07, FR-CON-01/02/03 | Version-mismatch handling; gate enforcement (§8.4) |
| M7 | Video/audio sessions | FR-CLI-08, FR-SES-01/02/03/04 | Join-authorization matrix (§8.5); no-recording assertion (recording capability not present in codebase at all, not just disabled) |
| M8 | Safeguarding & crisis workflow | FR-SAF-01–05, FR-THX-07 | Incident creation → notification job test; severity-based escalation path; **clinical/legal sign-off on the workflow itself required before this milestone is considered launch-ready, per PRD FR-SAF-05** |
| M9 | Feedback, complaints, admin reporting | FR-CLI-10/12, FR-ADM-03/06 | Complaint lifecycle transitions; reporting endpoint totals reconcile against seeded fixture data |
| M10 | Hardening & pilot readiness | NFR-SEC-*, NFR-CMP-05 | Dependency vulnerability scan clean; RBAC cross-tenant test suite (§8.6) green; accessibility pass on core flows (NFR-ACC-01); **Kenya legal review sign-off obtained (PRD §11) before any real client is onboarded** |

**Sequencing note:** M1–M3 can proceed in parallel with M4 design once the schema (F3) is stable. M5 (payments) and M8 (safeguarding) are the highest-risk milestones — money and client safety — and should not be compressed to hit a date.

---

## 11. Environments & Secrets

- **Local:** Docker Compose; M-Pesa sandbox credentials; video SDK test/dev project; seeded fixture data via a `prisma/seed.ts` script (therapists in every verification state, sample bookings in every status, so every UI/API state is reachable locally without manually walking the whole flow).
- **Staging:** mirrors production topology; used for the E2E suite (§9.4) and pilot dry-runs; M-Pesa sandbox still used here (not production till pilot go-live).
- **Production:** secrets (DB credentials, JWT signing key, M-Pesa production keys, video SDK keys, SMS/email provider keys) in a managed secrets store, never committed; `.env.example` documents required variables without values.

---

## 12. Definition of Done (applies to every feature in §10)

- [ ] Server-side validation via shared Zod schema (§2) — no endpoint trusts client-side validation alone
- [ ] RBAC + ownership check on every handler touching PII/clinical data
- [ ] Audit log entry written for mutating actions on protected resources
- [ ] Unit + integration tests written and passing (§9.2 minimums met for the module)
- [ ] Relevant golden-path E2E scenario (§9.3) updated if the flow changed
- [ ] No secrets, PII, or clinical content in logs (structured logger with an explicit redaction list)
- [ ] Reviewed against the specific guardrail in §8, if the feature touches booking, payment, consent, or safeguarding
- [ ] CI green (typecheck, lint, unit, integration, build)
