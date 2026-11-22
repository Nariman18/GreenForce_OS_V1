# Project Memory — GreenForce OS MVP

> Working checkpoint for AI-assisted development. The repository and verified command output win over this file.
> **The user makes all git commits/pushes — never commit or push.** The Figma prototype is reference-only: never
> reuse its code or styles.

## 0. Where we are now (updated 2026-11-17)

- 2026-11-17 owner direction: European launch, Denmark + Germany only. Read the attached four-page brief and both implementation documents. The owner's geographic change overrides the older brief.
- Replaced the second jurisdiction across maintained schemas, UI, property fixtures, seed projects/catalog, engine and tests. Germany is an explicit demonstration documentation checklist; it is NOT a validated legal pack. See docs/germany-scope.md.
- Seed/reseed guide: README "Editing and reseeding demo data". Edit source → build shared/backend → `npm run db:reset`. `db:seed` skips existing suppliers. Reset deletes ALL domain data and evidence files in the configured DB/storage, not just seeded rows. Do not run it just to test a code change.
- Reseed troubleshooting (2026-11-17): editing `seed.ts` then running host `db:seed` and Docker rebuild does not update an existing DB: host CLI reads compiled `backend/dist`, both startup/CLI seed skip when suppliers exist, and Docker preserves PostgreSQL volumes. For the running Docker app: `docker compose up -d --build backend frontend`, then `docker compose exec backend node dist/db/cli.js reset`, then refresh. Reset removes all domain records/uploads; no reset executed during troubleshooting.
- Verification for 2026-11-17: typecheck and lint passed; shared 11, backend 41 (isolated PostgreSQL), frontend 9 tests passed. German Playwright journey passed using a temporary harness on 3101/4101 with an isolated schema/upload directory; harness and test schema cleaned up. Shared/backend builds passed; frontend production build passed with `--webpack`. Default Turbopack build failed with a worker-port permission error even on escalated retry.
- Next.js CLI reported a dependency security advisory during build/dev; no dependency upgrades were made. Review separately before deployment. Current session did not audit advisory details.
- Existing local Docker app still uses its previously built images/data until the owner rebuilds and resets. No live demo reset was requested or performed in this session.
- Historical checkpoint: MVP workflow implemented; project restructured to backend/ frontend/ shared/ with Prisma (2026-10-26).
- 2026-11-02 session: full stack audit + upgrades (Node 26 LTS, Next 16.4.4, NestJS 12.3.2, @hookform/resolvers 7,
  vitest 5.1), production CI/CD pipeline (ci.yml, release.yml, deploy.yml, dependabot.yml, deploy/), docs/ci-cd.md.
- Next goal for the owner: `git init` → first commit(s) → push to GitHub → watch the first CI run → configure
  GitHub environments + a Docker host (docs/ci-cd.md "One-time setup") to enable staging/production deploys.
- Nothing is committed yet. German regulatory coverage remains a demo checklist.

## 1. Project Overview

- Business purpose: jurisdiction-aware construction compliance infrastructure (Green Wave Ventures).
- MVP objective: investor demo of the brief's workflow — address → property intelligence → setup → applicable rules &
  verdicts → evidence → materials/suppliers → funding → passport, for Denmark and Germany (owner override, 2026-11-17).
- Target users: contractors; passport consumers are owners, lenders, plan checkers.
- Product reference: `GreenForce_OS_MVP_Walkthrough_Brief.pdf`; current owner instructions supersede its geography (not in repo; summarised in docs/implementation-roadmap.md §1).

## 2. MVP Scope

- Implemented (verified): the brief workflow for DK + DE (German funding not yet modelled) — shared package; backend (auth, demo property adapter,
  projects, rule engine, evidence, materials & suppliers, funding/LBF, passport versions, history, demo seed/reset);
  frontend screens; Playwright E2E; Docker; CI + deploy template; README.
- Remaining product work: validated German legal editions/state rule packs, German funding programs, live sources.
- Excluded: marketplace, warehouse, community, AI advisor, multilingual, live registry integrations.

## 3. Technology Stack (pinned, re-verified with `npm view` on 2026-11-02)

- **Node 26 LTS "Lithium"** (26.13) for `.nvmrc`, Docker (`node:26.13-alpine3.24`) and CI; engines `>=24`.
  npm 11 workspaces, single root lockfile.
- TypeScript 6.0.3 (NOT 7: typescript-eslint <6.1, @nestjs/swagger ^6). ESLint 9.39.5 (NOT 10: eslint-config-next plugins).
- Frontend: Next 16.4.4, React 19.3.1, **Tailwind 4.3.3 (latest stable)**, TanStack Query 5.105.2, Zustand 5.0.16,
  RHF 7.91.0, @hookform/resolvers 7.0.1, lucide-react 1.66.0.
- Backend: NestJS 12.3.2 (ESM-only), @nestjs/swagger 12.1.0, @nestjs/jwt 12.0.3, bcryptjs, helmet, cookie-parser.
- ORM: **Prisma 7.10.1** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`). Do not take 8.x until stable.
- Shared: zod 4.6.7. Testing: vitest 5.1.0 (+ unplugin-swc, @swc/core 1.16.21), supertest, Testing Library, Playwright 1.64.1.
- DB: PostgreSQL 18.6 (`postgres:18.6-alpine3.24`).
- Overrides: `minimatch` → 11.0.4 for `@nestjs/cli` and `@typescript-eslint/typescript-estree` (GHSA-g3hv-75wg-m249).
  The multer override was removed (NestJS 12.3.2 ships multer 2.5.0).
- Audit: production deps 0 vulnerabilities; 15 moderate paths remain in ESLint-9 tooling (minimatch 3.x, no patched
  3.x release) — dev-only, accepted; CI gates: prod ≥ moderate, all ≥ high.
- npm `allowScripts`: esbuild, @swc/core@1.16.21, unrs-resolver, prisma, @prisma/engines allowed; @scarf/scarf, fsevents denied.
  (Update the @swc/core entry when bumping @swc/core.)

## 4. Monorepo Architecture

- `frontend/` (@greenforce/frontend): Next.js App Router; `/api/v1/*` rewritten to `API_INTERNAL_URL` (build-time).
  Own `Dockerfile` (standalone output) and `.env.example`.
- `backend/` (@greenforce/backend): NestJS; `src/modules/*`; `src/db/{prisma.ts,prisma.module.ts,cli.ts,seed/}`;
  `prisma/schema.prisma` + `prisma/migrations/`; `prisma.config.ts`; generated client in `src/generated/prisma`
  (git-ignored; `prisma generate` runs in build/dev/typecheck/test scripts). `Dockerfile` targets `migrate`, `runtime`.
- `shared/` (@greenforce/shared): ESM, built to dist (`npm run build:shared` first). No framework imports.
- Root: package.json workspaces [shared, backend, frontend], tsconfig.base.json, eslint.config.mjs, .prettierrc.json
  (YAML uses double quotes), docker-compose.yml (local), docs/ (roadmap, progress, ci-cd).
- `.github/`: workflows ci.yml (PR/develop/merge queue + workflow_call), release.yml (main → staging, tags → production),
  deploy.yml (reusable + manual rollback), dependabot.yml. `deploy/`: docker-compose.prod.yml (GHCR images,
  `bundled-db` profile), remote-deploy.sh (pull → migrate → rollout → auto-rollback), backend.env.example (placeholders).
- Pre-existing `.qodo/` left untouched.

## 5. Architecture Decisions

- Shared Zod schemas validate API input natively (Nest 12 `StandardSchemaValidationPipe` + `@Body({ schema })`);
  Swagger reads Zod JSON Schema. No DTO classes.
- Prisma (owner's choice, replaced Drizzle 2026-10-26). Env: backend loads `.env.example` then `.env`
  (`--env-file-if-exists`; `prisma.config.ts` uses `process.loadEnvFile`). DB URL = `DATABASE_URL` or built from
  `POSTGRES_*` (`src/config/database-url.ts`, shared by the app and prisma.config.ts).
- `backend/.env.example` holds **working dev-only defaults** (owner's teilhabekarte convention: compose loads it as
  env_file, `backend/.env` is an optional override). The API warns when `JWT_SECRET` starts with `dev-only-`.
- Tests: integration tests on real PostgreSQL; each file creates schema `test_<hex>`, applies the migration SQL in a
  transaction with `SET LOCAL search_path`, uses `PrismaPg(..., { schema })`, drops the schema on close (also on
  setup failure). Needs `docker compose up -d postgres` or `TEST_DATABASE_URL`; CI uses a postgres service.
- Compliance computed on read; passport versions persisted and hash-chained.
- Compose: postgres → migrate (one-shot: `prisma migrate deploy` + seed when DEMO_MODE=true) → backend → frontend;
  read_only, cap_drop ALL, no-new-privileges; uploads volume shared by migrate + backend.
- API runtime image installs prod deps with `--omit=dev --omit=optional --omit=peer` (the Prisma CLI/TypeScript are
  optional peers of @prisma/client, flagged devOptional) → ~440 MB. Migrate image reuses the build stage (~1.4 GB).

## 6. Implementation Roadmap

- Completed: phases 1–11, restructure (Prisma + backend/frontend/shared), CI/CD hardening (2026-11-02).
- Remaining (owner): git init + commits, first GitHub CI run, environments/secrets + Docker host for deploys.
- Post-MVP candidates: live registry adapters, expert-reviewed rule packs, real accounts/roles, object storage.

## 7. Completed Work

- All work is **uncommitted** (repo not `git init`-ed). Suggested commits in docs/implementation-progress.md.

## 8. Current Development Status

- Last completed: 2026-11-17 Denmark/Germany scope update; verification recorded in docs/implementation-progress.md.
- Known blockers: none. Workflows not yet executed on GitHub (no remote yet).

## 9. Verification Results (2026-11-02)

- `npm ci` clean install ✓; `npm run verify` exit 0 (Prettier, ESLint, typecheck, tests: shared 11, backend 42 on
  PostgreSQL, frontend 9; builds).
- Migration drift check `npm run db:check -w @greenforce/backend`: exit 0 in sync, exit 2 when schema.prisma changes
  without a migration (tested).
- actionlint 1.7.12 on all workflows ✓; shellcheck on deploy/remote-deploy.sh ✓.
- Docker (Node 26 images): compose up --build --wait all healthy; E2E passed against the stack.
- Deploy simulation (local registry, separate project): good deploy ✓; failing release → automatic rollback to the
  previous tag, healthy ✓ (found and fixed an IMAGE_TAG precedence bug in remote-deploy.sh).
- Local dev mode (`npm run dev`): API healthy, frontend 200, login via proxy 200.

## 10. Outstanding Issues

- Regulatory thresholds are demo values — disclaimed in UI/API/README.
- Seed EPD/supplier validity dates are fixed and will drift relative to "today".
- Demo seed is not one transaction (reset clears files first, then DB rows in a transaction).
- This dev machine: another project (teilhabekarte) uses host ports 3000 and 5432 → git-ignored root `.env`
  (POSTGRES_PORT=5433, FRONTEND_PORT=3100) and `backend/.env` (POSTGRES_PORT=5433, CORS_ORIGINS http://localhost:3100).
  Never stop the user's other containers.

## 11. Assumptions and Constraints

- Assumptions: MVP auth with demo account; demo registry adapter; DK-only funding; local-disk evidence storage.
- Constraints: no commits/pushes by the assistant; no prototype code/styles; Node 26 LTS / TS 6.0 / ESLint 9 / Prisma 7 pins.
- Unresolved: real data sources/credentials; who attests passport statements; hosting provider.

## 12. Next Steps

1. Owner: `git init`, review, commit, push to GitHub → first CI run (expect all green; fix anything runner-specific).
2. GitHub: branch protection on main (required check `ci-success`), environments staging/production (+ reviewers).
3. Provision a Docker host per environment (docs/ci-cd.md), set DEPLOY_* vars/secrets → staging deploy on main.
4. Product: live registry adapters; expert review of rule packs.

## 13. Continuation Instructions

- Start: read this file, docs/implementation-roadmap.md, docs/implementation-progress.md; `git status`/`git log`.
- Commands: `npm ci`; `docker compose up -d postgres`; `npm run db:migrate`; `npm run build:shared`;
  `npm run build -w @greenforce/backend && npm run db:seed`; `npm run dev` (or `docker compose up --build`);
  `npm run verify`; E2E: `E2E_PASSWORD=GreenForce-Demo-2026 E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.
- Schema change: edit `backend/prisma/schema.prisma` → `npm run db:migrate:dev -w @greenforce/backend -- --name <x>`.
- Gotchas: run Prettier from the repo root; `next build` typechecks `e2e/`; Next rewrites are build-time; Playwright's
  `request` fixture shares cookies with the page; the `PrismaPg` `schema` option does not change `search_path` for raw
  SQL; avoid the `# syntax=` Dockerfile directive (Docker Hub frontend pull timed out here).
