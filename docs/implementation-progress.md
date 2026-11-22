# Implementation progress

Status as of 2026-10-26. All work is **uncommitted** — the repository has not been `git init`-ed; commits are made by
the project owner. Suggested commit boundaries are listed per phase.

| Phase | Scope                                                                                                       | Status     | Verification (actually run)                                                                                                   | Suggested commit                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | Requirements, roadmap, MEMORY.md                                                                            | ✅ Done    | Docs reviewed against the brief                                                                                               | `docs: define MVP scope and implementation roadmap`                                           |
| 2     | Root workspaces, TS base, ESLint, Prettier, ignore files, `.env.example`                                    | ✅ Done    | `npm install` → one root lockfile; lint/format pass                                                                           | `build(monorepo): configure npm workspaces and shared tooling`                                |
| 3     | `packages/shared` schemas, contracts, constants                                                             | ✅ Done    | build, typecheck, 11 tests                                                                                                    | `feat(shared): add reusable schemas and API contracts`                                        |
| 4     | API foundation (config, DB, migrations, errors, auth, health, Swagger)                                      | ✅ Done    | build, typecheck, lint                                                                                                        | `feat(api): initialize NestJS backend foundation`                                             |
| 5     | API domain (properties, projects, rule engine, evidence, materials, funding, passport, history, seed/reset) | ✅ Done    | 42 tests (18 engine, 22 HTTP integration, 2 demo reset); smoke-tested on real PostgreSQL                                      | `feat(api): implement compliance domain modules` + `test(api): cover core business workflows` |
| 6     | Web foundation (Next 16, Tailwind 4 tokens, UI primitives, API client, Query, Zustand, proxy)               | ✅ Done    | typecheck, lint, build                                                                                                        | `feat(web): initialize Next.js frontend foundation`                                           |
| 7     | Web screens for the full journey                                                                            | ✅ Done    | 9 component/form tests; screenshots of every screen reviewed (desktop + 390 px, no console errors, no horizontal overflow)    | `feat(web): implement primary compliance workflows`                                           |
| 8     | Playwright E2E journey                                                                                      | ✅ Done    | passes against local stack and against Docker                                                                                 | `test(mvp): verify core application workflows`                                                |
| 9     | Dockerfile (api/web targets) + compose                                                                      | ✅ Done    | `docker compose up --build`: all services healthy, seed on first start, non-root users, E2E passes                            | `build(docker): containerize the MVP`                                                         |
| 10    | GitHub Actions CI + deploy template                                                                         | ✅ Written | Every CI command run locally via `npm run verify` (exit 0) and the Docker+E2E steps; **workflows not yet executed on GitHub** | `ci(github): add automated checks and deployment workflow`                                    |
| 11    | README, docs, final verification                                                                            | ✅ Done    | See below                                                                                                                     | `docs: document setup and investor demo`                                                      |

## Restructure (2026-10-26, requested by the owner)

- Layout: `apps/api` → `backend/`, `apps/web` → `frontend/`, `packages/shared` → `shared/`; `apps/` and `packages/`
  removed. Workspaces renamed `@greenforce/backend` / `@greenforce/frontend`.
- ORM: Drizzle (+ drizzle-kit, PGlite, direct `pg`) replaced by **Prisma 7.10.1** with `@prisma/adapter-pg`;
  initial migration `backend/prisma/migrations/*_init`. Integration tests now use real PostgreSQL (throwaway schemas).
- Docker: per-app `backend/Dockerfile` (targets `migrate`, `runtime`) and `frontend/Dockerfile`; root
  `docker-compose.yml` modelled on the owner's teilhabekarte stack (service defaults anchor, `backend/.env.example` +
  optional `backend/.env` env files, one-shot `migrate` job, read-only containers, dropped capabilities).
- Dependency review: removed `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `@electric-sql/pglite`, `@types/multer`
  (backend) and `clsx` (frontend). `npm audit`: 0 vulnerabilities (the esbuild advisory left with drizzle-kit).
- Suggested commit: `refactor: move apps to backend/frontend/shared and switch persistence to Prisma`.

## Final verification (2026-10-26, after the restructure)

- `npm run verify` → exit 0: Prettier ✓, ESLint ✓, typecheck ✓ (shared/backend/frontend), tests ✓
  (shared 11, backend 42 on PostgreSQL 18.6, frontend 9), builds ✓ (shared tsc, prisma generate + nest build, next build).
- Docker: `docker compose up --build --wait` → postgres healthy → migrate exited 0 (migrations + seed) → backend
  healthy → frontend healthy. API runtime image ~440 MB.
- E2E (`frontend/e2e/primary-journey.spec.ts`) passed against the Docker stack.
- Host-side `npm run db:migrate` / `db:seed` verified.

## Audit, upgrades and CI/CD (2026-11-02)

- Re-verified every dependency against the registry: Tailwind CSS 4.3.3 is the latest stable; applied stable updates
  (Next 16.4.4, NestJS 12.3.2, @nestjs/swagger 12.1.0, @hookform/resolvers 7.0.1, TanStack Query 5.105.2,
  lucide-react 1.66.0, vitest 5.1.0, @swc/core 1.16.21); moved to **Node 26 LTS** (`.nvmrc`, Docker, CI).
- Removed the multer override (fixed upstream); added scoped minimatch 11.0.4 overrides for a new advisory.
- New pipeline: `ci.yml` (actionlint, quality, tests + migration apply + drift check, build, audit gates, Docker +
  E2E + Trivy, `ci-success`), `release.yml` (build once → GHCR with provenance/SBOM → staging on main, production on
  tags), `deploy.yml` (SSH to a Docker host, migrate, health-checked rollout, automatic rollback, smoke test, manual
  rollback), `dependabot.yml`, `deploy/` (prod compose, deploy script, env template), guide `docs/ci-cd.md`.
- Verified: clean `npm ci`, `npm run verify` exit 0, actionlint/shellcheck clean, audit gates pass, drift check
  detects unmigrated schema changes, Docker stack + E2E pass on Node 26, deploy + rollback simulated with a local
  registry (fixed a rollback bug found by the simulation), local `npm run dev` mode works.
- Suggested commits: `build(deps): upgrade to Node 26 LTS and latest stable packages`,
  `ci: add release, deploy and dependency automation`.

## Outstanding

- CI/deploy workflows have not run on GitHub yet (no remote repository).
- Deployment target not chosen; `deploy.yml` is a template.
- See README → Known limitations.

## European launch scope update (2026-11-17)

- Read the owner's four-page PDF brief, original roadmap and saved memory. Applied current owner scope: Denmark and Germany only; the old PDF remains unchanged outside the repository.
- Updated shared jurisdiction constants/schemas, project declarations/measurements, metric property display, login/dashboard/search copy, setup forms, material attributes, demo registry, supplier/material catalog, seed projects and tests.
- Germany: four demo properties (two Berlin, Hamburg, Munich), German supplier names/countries and demo EPDs, cadastral/state/authority fields and metric units. The third seeded project is Berlin Mitte Offices; design energy demand 68 exceeds its declared project target 50 kWh/m²/yr.
- Replaced the second rule module with `germany.ts`: authority/legal-edition review, energy assessment/project target, fire documentation/product classification, Berlin heritage review and flood review. This is a demonstration checklist, not a validated German statutory rule pack. German funding remains explicitly unmodelled; Danish Landsbyggefonden retained. Details and primary-source links: `docs/germany-scope.md`.
- Added README seed source map and local/Docker reseed commands. `db:seed` skips an existing catalog; `db:reset` rebuilds domain data after sources are compiled. Reset deletes ALL domain records/uploads in the configured database/storage, including manually created projects; users survive. No live demo reset or container rollout performed.
- Added root `AGENTS.md`: read memory/plan before work, persist meaningful changes/results, follow Denmark/Germany scope, owner-only commits/pushes.
- Source/output search found no references to the retired region in maintained project files or rebuilt shared/backend output (dependency caches, generated framework output and external PDF excluded).

Validation actually run:

- `npm run typecheck` and `npm run lint`: passed.
- Shared 11, backend 41, frontend 9 tests: passed. Backend integration/reset tests use isolated PostgreSQL schemas and temporary uploads. Initial sandbox database access failed; escalated test run succeeded.
- German Playwright journey: passed using a temporary test harness with isolated PostgreSQL schema/uploads, API :4101 and Next dev :3101. Tested address → declarations → requirements → PDF upload → material selection/link → issued passport. Temporary harness removed and schema/files/server cleaned up.
- Shared/backend production builds: passed. Default frontend Turbopack build failed with a worker-port permission error, including an escalated retry. `npm run build -w @greenforce/frontend -- --webpack`: passed. Build configuration was not changed.
- Next.js CLI reported a dependency security advisory during build/dev and initially stopped the dev server. Retry succeeded; dependencies were not upgraded, and advisory details were not audited in this scope. Review before deployment.

Next: owner reviews fixture content, exports any needed current demo records, rebuilds Docker backend/frontend and runs the documented reset when ready. Product follow-up: validated German federal/state legal editions, real property adapters and German funding. No git repository is initialized; no commits/pushes performed.

### Reseed troubleshooting (2026-11-17)

Confirmed from package scripts, seed guard, Dockerfile and Compose: the host seed executes compiled `dist`, seeding skips an existing supplier catalog, and Docker rebuild retains database volumes. Documented the Docker sequence: rebuild application images, execute `node dist/db/cli.js reset` inside the running backend, refresh the browser. Existing README already includes these commands and full reset deletion scope. No application changes or database reset were required/performed for this explanation.
