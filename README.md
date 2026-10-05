# Mind Hub

A clinically governed digital mental-health and counselling platform for Kenya. See [docs/PRD.md](docs/PRD.md) for product scope and [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the engineering plan this codebase implements.

## Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + TypeScript (Express, Prisma)
- **Database:** PostgreSQL
- **Jobs/cache:** Redis (BullMQ) — releases expired unpaid bookings every minute

## Monorepo layout

```
apps/
  web/       React frontend
  api/       Express + TypeScript + Prisma backend
packages/
  shared/    Zod schemas & types shared by web and api
infra/
  docker-compose.yml   Local Postgres (dev + test) and Redis
```

## Getting started

Requires Node.js 20+ and Docker. Run everything from the repo root.

```bash
# 1. Start local Postgres (dev + test) and Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Install dependencies (npm workspaces)
npm install

# 3. Build the shared package — api and web import it from packages/shared/dist,
#    so re-run this after any change under packages/shared
npm run build --workspace packages/shared

# 4. Configure environment
cp apps/api/.env.example apps/api/.env   # set JWT_ACCESS_SECRET, e.g. `openssl rand -hex 32`

# 5. Run database migrations + generate the Prisma client (re-run after schema changes)
npm run db:migrate --workspace apps/api

# 6. Seed demo data (admin, client, therapist) — safe to re-run
npm run db:seed --workspace apps/api
```

Then start each app in its own terminal:

```bash
npm run dev:api   # terminal 1 — http://localhost:4000 (GET /health returns {"status":"ok"})
npm run dev:web   # terminal 2 — http://localhost:5173
```

The web app calls `http://localhost:4000/api/v1` by default; set `VITE_API_URL` to point it elsewhere. M-Pesa runs in stub mode while the Daraja credentials in `.env` are unset, so booking and payment work locally without Safaricom keys. SMS works the same way: with `AT_USERNAME`/`AT_API_KEY` unset, texts (OTP codes, session reminders, message alerts) are written to the API log instead of sent.

### Demo accounts

Log in with the phone number. The password for all three is `dev-password-123`.

| Role      | Phone           |
| --------- | --------------- |
| Admin     | `+254700000001` |
| Client    | `+254700000002` |
| Therapist | `+254700000003` |

### Port 5173 already in use

The API only accepts browser requests from `WEB_ORIGIN` (default `http://localhost:5173`). If another process holds port 5173, Vite silently moves to 5174 and every API call fails with a CORS error. Either free port 5173, or run the web app on another port and point `WEB_ORIGIN` at it:

```bash
# apps/api/.env
WEB_ORIGIN=http://localhost:5180

npm run dev:api                                                # restart so it picks up the change
npm run dev --workspace apps/web -- --port 5180 --strictPort   # not `npm run dev:web -- --port`, which drops the flag
```

## Testing

```bash
npm run typecheck        # all workspaces
npm run lint             # all workspaces
npm test                 # unit tests (shared, api, web) — no DB required
npm run test:integration # apps/api integration tests — requires the postgres_test
                          # container from infra/docker-compose.yml to be running
```

`apps/api/.env.test` holds dummy, non-production test secrets and is committed intentionally so CI and local integration tests share one config source — see the comment in `.gitignore`.

## Current scope

This scaffold implements Phase 1 (foundation) and the following Phase 2 milestones from [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md):

- **Auth** — registration, OTP phone verification, login, refresh-token rotation with reuse detection, RBAC, audit logging.
- **M1: Therapist onboarding** — therapist profile + credential submission, public therapist directory (ACTIVE-only), and the admin verify/reject/suspend review workflow.
- **M2: Intake & safety screening** — server-side-only risk assessment gating self-service booking.
- **M3: Matching** — transparent rules-based therapist matching, capped at 5, idempotent.
- **M4: Availability & booking** — slot management, race-safe booking, cancellation policy, expired-booking release job.
- **M5: Payments (M-Pesa)** — Daraja STK push integration with a stub fallback when no real credentials are configured, idempotent initiate + callback handling.
- **M6: Consent** — versioned informed consent, re-consent on version changes.
- **M7: Video/audio sessions** — full join-authorization gate (ownership, booking status, consent version, time window), session completion, no session recording capability.
- **M9: Feedback, complaints, admin reporting** — post-session feedback, complaint lifecycle (open → in review → resolved/closed), admin reporting overview (bookings by status, completion/cancellation rate, revenue, open complaints).
- **M10 (automatable parts only)** — dependency vulnerability scan clean (`npm audit`: 0 vulnerabilities), RBAC cross-tenant test coverage audited and gaps closed, a basic accessibility pass on the core auth flows (autocomplete/input-type correctness per WCAG 1.3.5, loading-state announcements).

**Added after the [BetterHelp comparison](docs/BETTERHELP_COMPARISON.md)** (scope beyond the original MVP, requested by the product owner):
- **SMS reminders** — Africa's Talking client (stubbed without credentials); discreet reminders a day and an hour before each session; one opt-out switch per user.
- **Secure messaging** — between a client and therapist once they share a paid booking; a keyword screen surfaces 999/112 to clients and highlights the message for the therapist.
- **Switch therapist** — new matches from the latest intake, excluding past therapists; the reason is for admin quality review only.
- **Richer profiles and ratings** — photo, experience, registration number; average rating shown only from 5 ratings up, comments never published.
- **Client toolkit** — journal, goals and worksheets, private by default and shareable item by item with one therapist; therapists can assign worksheets.
- **Reduced fees** — therapist-set reduced fee, admin-approved client applications (6 months), fee fixed on the booking at creation.
- **Live text-chat sessions** — a third session type alongside video and audio.
- **Gift sessions** — M-Pesa-paid gift balances, redeemed at checkout with a race-safe balance decrement.

**Not built:**
- **M8: Safeguarding & crisis workflow** — scoped in the build plan but intentionally not built. Per the plan, this one specifically requires clinical/legal sign-off on the actual workflow before it's launch-ready, not just code — building it without that input would mean guessing at a safety-critical process.
- **The rest of M10** — a real accessibility pass (screen reader testing, not just static checks) and, critically, **the Kenya legal review sign-off (PRD §11) before any real client is onboarded** are not things this session can complete; they need a human (and per the PRD, a Kenyan health-law/privacy specialist) in the loop.
