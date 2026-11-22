# GreenForce OS — MVP

**Jurisdiction-aware compliance infrastructure for construction.** Enter a project address; GreenForce identifies the
property and its authority, determines which regulations apply _to this project_ (and which edition is in force),
tells you what proof is needed, tracks that proof, links requirements to compliant materials and qualified suppliers,
and records everything in a fingerprinted **Compliance Passport**.

The MVP demonstrates one workflow across two regulatory environments — **Denmark (BR18)** and **Germany
(demonstration documentation checklist)**:

```
Project address → Property intelligence → Project setup → Applicable requirements & verdicts
→ Required evidence → Compliant materials & suppliers → Funding → Compliance passport
```

> ⚠️ Demonstration software. Property data comes from a curated **demo registry**, and the rule packs encode a
> **demonstration interpretation** of public summaries of the cited regulations. Nothing here is legal advice.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Editing and reseeding demo data](#editing-and-reseeding-demo-data)
- [Investor demo script](#investor-demo-script)
- [Commands](#commands)
- [Environment variables](#environment-variables)
- [API](#api)
- [Testing](#testing)
- [CI/CD & deployment](#cicd--deployment)
- [Known limitations & mocked parts](#known-limitations--mocked-parts)
- [Future improvements](#future-improvements)

---

## Features

| Brief step               | What the MVP does                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Address search        | Jurisdiction-aware search; the backend resolves the property and issues a deterministic **GreenForce ID** (e.g. `GF-DK-T9S3-5J1P`).                                                                             |
| 2. Property intelligence | DK: BBR use, year, area, heating, cadastral parcel, municipality, authority, funding route. DE: cadastral parcel, metric areas, land use, federal state, local authority, planning and heritage/flood overlays. |
| 3. Project setup         | Declarations per jurisdiction (validated by shared Zod schemas) + design measurements (LCA result, energy demand, …).                                                                                           |
| 4. Requirements          | Rule engine resolves the edition from the application/permit date and reports rules **checked / apply / set aside / can't decide**, each with its reason.                                                       |
| 5. Verdicts              | Confirmed · Passes · Fails — fix needed · Proof missing · Proof in progress · Pack complete · Can't decide yet, plus a ranked **"What do I need to fix?"** list.                                                |
| 6. Evidence              | Upload per requirement (type + magic-byte checks, 10 MB), **server-side SHA-256**, verify, download, remove, or link a selected material's EPD.                                                                 |
| 7. Passport              | Live record + immutable versions, each chained to the previous fingerprint; formal statement for owners/lenders/plan checkers; print & JSON export; history.                                                    |
| 8. Readiness             | Mean of **rules decided**, **proof in** and **computed checks passing**.                                                                                                                                        |
| 9. Funding               | Landsbyggefonden renovation support: eligibility criteria, information requirements, links to compliance status; the six contractor questions.                                                                  |
| 10. Materials            | Catalog scored against applicable rules: GWP vs limits, EPD validity, Euroclass, supplier rating/result, "counted" validity, info required.                                                                     |

Rule packs: **DK** — BR18 2018 / 2023 / July 2025 editions: LCA documentation, climate limits by building type,
construction-process limit, energy frame, renovation components, fossil-boiler ban, construction & fire classes,
Landsbyggefonden. **DE** — demo documentation checklist for authority/legal-edition review, energy assessment,
fire strategy/product classifications, Berlin heritage consent and flood review. Germany's numeric energy check uses
an explicitly declared **project target**, not a statutory threshold; applicable legal editions and state requirements
need professional review. See [Germany scope and sources](docs/germany-scope.md).

Seeded demo projects: _Tingbjerg Block C_ (social housing renovation, funding in progress, issued passport v1),
_Nordhavn Pier 7_ (office failing the demo 2025 climate limit), _Berlin Mitte Offices_ (design energy demand of
68 against a project target of 50 kWh/m²/yr).

## Architecture

```
Browser ─► Next.js 16 (frontend/) ── /api/v1/* rewrite (same origin) ─► NestJS 12 (backend/) ─► PostgreSQL 18
           TanStack Query · Zustand · RHF+Zod                           Prisma 7 (pg driver adapter)
                                                                        Rule engine (pure TS)
                                                                        Demo property adapter · evidence files (volume)
shared/ ─ Zod schemas · inferred types · API contracts · constants (used by frontend and backend)
```

- **One validation source.** The API validates bodies/queries/params with the **same Zod schemas** the web forms use
  (NestJS 12 `StandardSchemaValidationPipe` + `@Body({ schema })`), and Swagger documents them from the same schemas.
- **Persistence:** Prisma 7 (`backend/prisma/schema.prisma`, SQL migrations in `backend/prisma/migrations`), connecting
  through `@prisma/adapter-pg`. The generated client lives in `backend/src/generated/prisma` (git-ignored, created by
  `prisma generate` in every build/test/dev script).
- **Compliance is computed on read** from setup + measurements + evidence + selected materials, so it is always
  consistent; only passport versions are persisted (immutable, hash-chained).
- **Auth:** demo accounts, bcrypt hashes, HS256 JWT in an `httpOnly` `SameSite=Lax` cookie, a global API guard,
  ownership checks (other users' projects return 404). The Next.js `proxy.ts` only improves navigation; the API is the
  authority.
- **Styling:** Tailwind CSS v4 with design tokens in `frontend/src/app/globals.css` (`@theme`). Visual decisions live
  in `components/ui/*` and the badge/verdict style maps, so the styling layer can be replaced without touching data
  or business logic.

```
backend/   NestJS API — Dockerfile (targets: migrate, runtime) · prisma/{schema.prisma,migrations/} · prisma.config.ts
           src/modules/{auth,properties,projects,compliance/engine,evidence,materials,funding,passport,audit,health,demo}
           src/db/{prisma.ts,prisma.module.ts,cli.ts,seed/} · src/config/ · test/ · .env.example
frontend/  Next.js app — Dockerfile · src/app/(app)/{page,projects/new,projects/[id]/{setup,requirements,evidence,
           materials,funding,passport}} · src/components/{ui/*,…} · src/lib/ · src/store/ · tests/ · e2e/ · .env.example
shared/    src/{schemas,contracts,constants} · test/
docs/      implementation-roadmap.md · implementation-progress.md
docker-compose.yml · package.json (npm workspaces) · package-lock.json · .github/workflows/{ci,deploy}.yml · MEMORY.md
```

## Technology stack

| Area     | Choice (pinned)                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime  | **Node.js 26 LTS** (`.nvmrc`, Docker `node:26.13-alpine3.24`; Node ≥ 24 works), npm 11 workspaces, single root `package-lock.json`                                  |
| Language | TypeScript **6.0.3** (strict) — TS 7 is not yet supported by typescript-eslint / @nestjs/swagger                                                                    |
| Frontend | Next.js 16.4.4 (App Router), React 19.3.1, Tailwind CSS 4.3.3, TanStack Query 5.105, Zustand 5.0.16, React Hook Form 7.91 + @hookform/resolvers 7.0.1, lucide-react |
| Backend  | NestJS 12.3 (ESM), @nestjs/swagger 12.1.0, @nestjs/jwt, helmet, cookie-parser, bcryptjs                                                                             |
| ORM      | **Prisma 7.10.1** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) — newest stable; the CLI's npm `latest` tag points to an 8.0 release candidate                 |
| Shared   | Zod 4.6.7                                                                                                                                                           |
| Database | **PostgreSQL 18.6** (`postgres:18.6-alpine3.24`) — newest stable (19 is a release candidate)                                                                        |
| Testing  | Vitest 5 (+ unplugin-swc for decorators), Testing Library, Supertest, Playwright 1.64                                                                               |
| Tooling  | ESLint 9.39 (flat config, eslint-config-next), Prettier 3.9, concurrently (dev script), Docker, GitHub Actions                                                      |

## Quick start (Docker)

Prerequisites: Docker with Compose v2.

```bash
docker compose up --build
```

That's all for a local demo: `backend/.env.example` contains **development-only defaults** (database credentials,
JWT secret, demo password) that compose loads automatically. Put overrides in `backend/.env` (git-ignored), and
never use the example values outside local development — the API logs a warning while the development JWT secret
is in use.

Startup order: `postgres` (healthy) → `migrate` (one-shot: `prisma migrate deploy`, then the idempotent demo seed when
`DEMO_MODE=true`) → `backend` (healthy) → `frontend`.

- Frontend: **http://localhost:3000** — sign in with `demo@greenforce.dev` / `GreenForce-Demo-2026` (or your overrides)
- API docs: **http://localhost:4000/api/docs**

Published ports and bind addresses come from the shell or a root `.env` file: `POSTGRES_PORT` (5432),
`BACKEND_PORT` (4000), `FRONTEND_PORT` (3000), `BACKEND_BIND_ADDRESS` / `FRONTEND_BIND_ADDRESS` (127.0.0.1). If you
change `FRONTEND_PORT`, add that origin to `CORS_ORIGINS` in `backend/.env` only if you call the API directly.

The backend and frontend containers run as the non-root `node` user with read-only root filesystems, all Linux
capabilities dropped and `no-new-privileges`.

```bash
docker compose down        # stop (data kept in volumes)
docker compose down -v     # stop and delete the database and uploaded evidence
```

## Local development

Prerequisites: Node.js 26 LTS (`nvm use`), npm ≥ 10, Docker (for PostgreSQL).

```bash
npm ci
docker compose up -d postgres                 # PostgreSQL only
npm run db:migrate                            # prisma migrate deploy
npm run build -w @greenforce/shared && npm run build -w @greenforce/backend && npm run db:seed
npm run dev                                   # shared (watch) + backend :4000 + frontend :3000
```

Backend scripts load `backend/.env.example` then `backend/.env` (Node `--env-file`; Prisma via `prisma.config.ts`).
The database URL is `DATABASE_URL` if set, otherwise built from `POSTGRES_*`. The frontend forwards `/api/v1/*` to
`API_INTERNAL_URL` (default `http://localhost:4000`); Next.js honours `PORT` if 3000 is busy
(`PORT=3100 npm run dev:frontend`).

Schema changes: edit `backend/prisma/schema.prisma`, then run `npm run db:migrate:dev -w @greenforce/backend -- --name <change>`
to create and apply a migration. Reset demo data with `npm run db:reset` or the **Reset demo** button
(when `DEMO_MODE=true`).

## Editing and reseeding demo data

Edit these sources:

- `backend/src/db/seed/seed.ts`: demo account profile, projects, declarations, measurements, evidence and initial passport.
- `backend/src/db/seed/catalog.ts`: suppliers, materials, EPDs, validity dates and country availability.
- `backend/src/modules/properties/demo/fixtures.ts`: searchable addresses and property intelligence.
- `backend/src/modules/compliance/engine/rules/`: demo requirement packs, separate from seed data.

`db:seed` only seeds an empty catalog; it **skips existing data**. To apply edits to an existing local demo database,
run from the repository root:

```bash
npm run build:shared
npm run build -w @greenforce/backend
npm run db:reset
```

**Reset deletes ALL projects, properties, evidence files, passports/history, material selections, materials and suppliers
in the configured database/upload directory**, including manually created records. Users are retained, and the demo
profile/password is updated from the seed/config. Check `backend/.env` before running; export anything you need first.
The CLI is `backend/src/db/cli.ts` (`reset` → `seedDemo(..., { reset: true })`). It runs compiled `backend/dist` code,
so always rebuild after seed changes. No Prisma schema migration is required for these fixture/JSON changes.

For the Docker stack, rebuild the application first, then reset through the backend container so database and evidence
storage match:

```bash
docker compose up -d --build backend frontend
docker compose exec backend node dist/db/cli.js reset
```

The **Reset demo** button uses the running backend's compiled seed and has the same deletion scope. Rebuilding
containers alone does not replace existing data because the startup seed is idempotent. Restart/rebuild any running
application after changing jurisdiction schemas; old jurisdiction records require reset before the new app reads them.

## Investor demo script

1. **Sign in** → dashboard with three projects and their readiness.
2. **Nordhavn Pier 7** → _Requirements_: edition resolved from the application date (BR18, July 2025); the climate
   limit **fails** (8.1 vs 7.5 kg CO₂e/m²/yr) with the fix stated; set-aside rules explain why.
3. **New project** → Germany → search "Karl-Marx-Allee" → review cadastral details, Berlin authority and demo heritage overlay → create.
4. **Setup**: major renovation, GK3, private, application date 2026-02-10, 2,600 m². Review the demo documentation checklist; legal requirements need professional review.
5. **Evidence**: upload a PDF for the fire strategy → _Proof in progress_; inspect the SHA-256 fingerprint.
6. **Materials**: select _Mineral wool board CI_ (Euroclass A1, qualified supplier); compare the unclassified sample → link the selected product as insulation evidence.
7. **Tingbjerg Block C** → _Funding_: Landsbyggefonden eligibility and missing information requirements.
8. **Passport**: issue a version, show the fingerprint chain, print the formal statement, download JSON.
9. **Reset demo** to start again.

## Commands

| Command                             | Purpose                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                       | Shared (watch) + backend + frontend in development                         |
| `npm run build`                     | Build shared → backend (prisma generate + nest build) → frontend           |
| `npm run lint`                      | ESLint across all workspaces                                               |
| `npm run format` / `format:check`   | Prettier write / check                                                     |
| `npm run typecheck`                 | `tsc` for shared, backend and frontend                                     |
| `npm test`                          | Shared + backend (engine unit + HTTP integration on PostgreSQL) + frontend |
| `npm run test:e2e`                  | Playwright journey against a running stack (see Testing)                   |
| `npm run verify`                    | Everything CI's quality job runs                                           |
| `npm run db:migrate`                | `prisma migrate deploy`                                                    |
| `npm run db:seed` / `db:reset`      | Idempotent demo seed / reset demo data (requires a built backend)          |
| `npm run docker:up` / `docker:down` | Compose shortcuts                                                          |

## Environment variables

`backend/.env.example` (development defaults, loaded by compose and scripts; override in `backend/.env`):

| Variable                                                       | Notes                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`            | Used by the postgres container and to build the connection URL  |
| `POSTGRES_HOST`, `POSTGRES_PORT`                               | `localhost:5432` on the host; compose sets `postgres:5432`      |
| `DATABASE_URL`                                                 | Optional; overrides the `POSTGRES_*` values                     |
| `API_PORT`, `JWT_SECRET`, `SESSION_TTL_HOURS`, `COOKIE_SECURE` | `JWT_SECRET` ≥ 32 chars; `COOKIE_SECURE=true` behind HTTPS      |
| `CORS_ORIGINS`                                                 | Only for direct browser→API calls (the frontend is same-origin) |
| `DEMO_MODE`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`           | Demo reset endpoint and seeded account                          |
| `UPLOAD_DIR`, `SWAGGER_ENABLED`                                | Evidence storage path; OpenAPI UI                               |

`frontend/.env.example`: `API_INTERNAL_URL` — where Next.js forwards `/api/v1/*` (**build-time** for Docker images;
compose passes `http://backend:4000`). Compose host settings (`POSTGRES_PORT`, `BACKEND_PORT`, `FRONTEND_PORT`,
bind addresses) are read from the shell or a root `.env`.

## API

REST under `/api/v1`, OpenAPI UI at `/api/docs` (JSON: `/api/docs/openapi.json`). Sign in with `POST /auth/login`
in Swagger to receive the session cookie. The contract is listed in `shared/src/contracts/api.ts`; every error uses
`{ statusCode, error, message, details? }`.

## Testing

- **Shared** (`shared/test`): schema validation and contract helpers.
- **Backend** (`backend/test`): rule-engine unit tests (editions, thresholds, verdict precedence, readiness) and HTTP
  integration tests that boot the real Nest app against **PostgreSQL**. Each test file creates a throwaway schema,
  applies the Prisma migrations, seeds, and drops the schema afterwards — your data is never touched. Requires a
  running database (`docker compose up -d postgres`) or `TEST_DATABASE_URL`.
- **Frontend** (`frontend/tests`): shared-schema form validation, verdict/fix-list/readiness components, upload checks.
- **E2E** (`frontend/e2e`): the German documentation journey from sign-in to an issued passport version. Run against a
  running stack:

  ```bash
  npx --workspace @greenforce/frontend playwright install chromium   # once
  E2E_PASSWORD=GreenForce-Demo-2026 E2E_BASE_URL=http://localhost:3000 npm run test:e2e
  ```

  The test resets demo data first (requires `DEMO_MODE=true`).

## CI/CD & deployment

Full guide: **[docs/ci-cd.md](docs/ci-cd.md)** (pipeline, one-time GitHub/server setup, releases, rollbacks, Tailwind
updates).

- **CI** (`ci.yml`) on every pull request, `develop` and the merge queue: actionlint, Prettier, ESLint, typecheck,
  migrations on an empty PostgreSQL 18 + schema drift check, all tests, builds, `npm audit` gates, then the Docker
  stack with the Playwright journey and a Trivy image scan. Branch protection needs one check: `ci-success`.
- **Release** (`release.yml`): push to `main` → CI → publish images to GHCR → deploy to **staging**; tag `vX.Y.Z` →
  same images → deploy to **production** (approval via the GitHub environment).
- **Deploy** (`deploy.yml` + `deploy/`): SSH to a Docker host, run migrations, roll out with health checks, automatic
  rollback on failure, smoke test; also runnable manually for redeploys/rollbacks. Skipped with a notice until the
  environment has a `DEPLOY_HOST`.
- **Dependabot**: weekly grouped updates for npm (Tailwind in its own group), Actions and Docker images.

## Known limitations & mocked parts

- **Property data is mocked** — `DemoPropertyProvider` serves 8 curated addresses (4 DK, 4 DE). Values are sample
  data, flagged `isDemo` in API responses and the UI. Live adapters (Datafordeler/BBR and German cadastral/municipal
  registries) are future work behind the same `PropertyDataProvider` port.
- **Regulatory content is a demonstration** — thresholds and applicability follow public summaries and need expert
  verification. Funding is modelled for Denmark only (Landsbyggefonden).
- **Material & supplier catalog** is sample data with illustrative EPD numbers; validity is evaluated against
  today's date, so some records are intentionally expired.
- Auth is MVP-level: no sign-up, password reset, roles, rate limiting or CSRF tokens (SameSite=Lax cookie only).
- Evidence is stored on local disk / a Docker volume; "verified" is a self-attestation flag, not third-party review.
- The formal statement is printable HTML (browser print to PDF), not a signed PDF.
- Demo seeding runs through the services and is not one transaction; if it fails midway, run `npm run db:reset`.
- The migrate image (~1.4 GB) reuses the build stage with the Prisma CLI; the API runtime image is ~440 MB.

## Future improvements

Live registry integrations · more jurisdictions and rule editions maintained by regulatory experts · cost estimation
and procurement/RFQ · supplier onboarding portal · third-party verification and signed PDF passports · organisations,
roles and SSO · object storage with virus scanning · audit export · i18n (Danish/German/English).

---

Project working notes for AI-assisted development: `MEMORY.md`. Plan: `docs/implementation-roadmap.md`.
Status: `docs/implementation-progress.md`.
