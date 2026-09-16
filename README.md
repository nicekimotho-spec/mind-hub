# Mind Hub

A clinically governed digital mental-health and counselling platform for Kenya. See [docs/PRD.md](docs/PRD.md) for product scope and [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the engineering plan this codebase implements.

## Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + TypeScript (Express, Prisma)
- **Database:** PostgreSQL
- **Jobs/cache:** Redis (BullMQ) — wired in a later milestone

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

```bash
# 1. Start local Postgres (dev + test) and Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Install dependencies (npm workspaces)
npm install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env   # edit JWT_ACCESS_SECRET etc.

# 4. Run database migrations + generate the Prisma client
npm run db:migrate --workspace apps/api

# 5. Seed demo data (admin, client, therapist)
npm run db:seed --workspace apps/api

# 6. Run the apps
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:5173
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

Remaining Phase 2 milestones (intake/safety-screening, matching, booking, M-Pesa payments, consent, video/audio sessions, safeguarding) are scoped in the build plan but not yet built.
