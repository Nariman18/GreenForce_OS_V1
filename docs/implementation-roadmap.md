# GreenForce OS — MVP Implementation Roadmap

Product reference: `GreenForce_OS_MVP_Walkthrough_Brief.pdf` (Green Wave Ventures), read on 2026-11-17.
The owner's 2026-11-17 direction supersedes the brief's old geography: initial scope is **Denmark and Germany only**.
The brief supplies the product workflow, not development instructions. See `germany-scope.md` for implementation limits.
The Figma prototype (greenforcebeta.figma.site) was consulted **only** to understand the product idea; no code, styles or
visual design from it are used.

---

## 1. Requirements summary

**Product.** GreenForce OS is a jurisdiction-aware compliance infrastructure layer for construction. A contractor enters a
project address; GreenForce identifies the property and its jurisdiction, determines which regulations apply _to this
project_, tells the contractor which evidence is needed, tracks that proof, connects requirements to compliant materials
and qualified suppliers, and produces a persistent, fingerprinted **Compliance Passport**.

**Value proposition (brief, "Why contractors pay").** Save labour (no regulation research), reduce rework (catch
problems before procurement/submission), improve purchasing (materials that satisfy requirements from qualified
suppliers), create defensible documentation (why a rule applied, what proved it, whether it passed).

**Target users.** Primary: contractors / project teams. Secondary consumers of the output: owners, lenders, plan
checkers and other stakeholders (read the passport / formal statement).

**Two regulatory environments, one experience.**

| Area         | Denmark                                                                                        | Germany                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Requirements | BR18 → building type → application date → LCA/climate → funding → evidence                     | Demo documentation checklist → application date → authority/state review → energy/fire/heritage/flood evidence |
| Property     | BBR, cadastre, metric area, municipality, authority, funding route                             | Cadastral parcel/district, metric area, land use, federal state, local authority, zoning, overlays             |
| Setup        | Nature, building type, heating, funding, construction/fire class, exemptions, application date | Nature, building type, funding route, Gebäudeklasse, application date, m², optional project energy target      |

**Workflow (brief).** Project address → Project intelligence → Applicable requirements → Required evidence → Compliant
material options → Supplier options → Documentation → Compliance status → Project passport.

### Requirement → feature mapping

| #   | Brief section            | MVP feature                                                                                                                                                |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Address / project search | Jurisdiction-aware address search; property resolved by backend adapter; deterministic **GreenForce ID**                                                   |
| 2   | Property intelligence    | Property record page (jurisdiction-specific fields, authority, overlays, data source/provenance)                                                           |
| 3   | Project setup            | Validated setup form per jurisdiction (shared Zod schemas) + design measurements                                                                           |
| 4   | Compliance requirements  | Rule engine: edition resolution by application/permit date; rules checked / apply / set aside / can't decide                                               |
| 5   | Compliance verdict       | Per-rule verdict: Confirmed, Passes, Fails — fix needed, Proof missing, Proof in progress, Pack complete, Can't decide yet; "What do I need to fix?" list  |
| 6   | Evidence                 | Requirement → Evidence → Status; real file upload with server-side SHA-256; verify/remove; link selected material EPDs                                     |
| 7   | Compliance passport      | Live passport + immutable versioned snapshots (hash-chained fingerprints), history, printable formal statement, JSON export                                |
| 8   | Score / readiness        | Rules decided %, Proof in %, Computed checks passing %, overall readiness                                                                                  |
| 9   | Funding / money case     | Funding program evaluation (Landsbyggefonden renovation support for DK): eligibility criteria + information requirements                                   |
| 10  | Materials & suppliers    | Material catalog with EPD/GWP/validity, supplier rating/result/score, "counted" flag, additional-info flag; project-specific recommendations and selection |

### Authentication

Not described in the brief. Because projects and evidence belong to a contractor organisation, the MVP includes a small
but real auth flow: seeded demo accounts, bcrypt password hashes, signed JWT in an `httpOnly` cookie, backend guard on all
project endpoints, frontend route protection (UX only — the backend is the authority). No self-registration.

### Out of MVP scope (future product, seen in the prototype or implied)

Marketplace / shopping cart / payments, warehouse & logistics, community/learning, AI advisor/chat, multilingual UI,
vendor & enterprise portals, cross-border bidding, real registry integrations (Datafordeler/BBR, German cadastral and municipal registries), e-signatures, PDF rendering server-side, multi-tenant org administration, role-based permissions
beyond "contractor".

---

## 2. MVP scope

**In scope:** everything in the mapping table above for **Denmark** and **Germany**, with a curated demo property
registry (clearly labelled as demo data) behind a `PropertyDataProvider` adapter, a curated material & supplier catalog,
data-driven rule packs with edition resolution, PostgreSQL persistence, demo seed + reset.

**Explicitly mocked / demo:**

- Property data (BBR / cadastre / overlays) comes from `DemoPropertyProvider` — fixtures, not live registries.
- Danish rules demonstrate BR18 and Landsbyggefonden. Germany uses a documentation checklist with manual legal-edition/state review; numeric energy checks are against user-declared project targets. Neither pack is production legal advice.
- Material, EPD and supplier records are sample data.

---

## 3. Primary user journeys

1. **Sign in** with the demo contractor account → dashboard of projects with readiness.
2. **New German project:** choose Germany → search "Karl-Marx-Allee" → review sample cadastral/municipal details and heritage overlay → create project (GreenForce ID issued).
3. **Project setup:** declare nature, building type/class, funding, application date, metric area and optional energy design target → save → requirements re-evaluate.
4. **Requirements & verdicts:** see resolved edition, counts (checked / apply / set aside / can't decide), each rule's
   reason and verdict; "What do I need to fix?" list.
5. **Evidence:** upload documents per requirement (SHA-256 fingerprinted), verify, see proof status move from
   _missing_ → _in progress_ → _pack complete_.
6. **Materials & suppliers:** see materials that satisfy the project's requirements (EPD validity, EPD validity, Euroclass and project targets), supplier rating and whether info is counted; select material → link its EPD as evidence.
7. **Funding (DK):** Tingbjerg social-housing renovation → Landsbyggefonden eligibility criteria + information requirements.
8. **Passport:** review the live record, issue a versioned snapshot (fingerprint + previous fingerprint), print the
   formal statement for owners/lenders/plan checkers, download JSON, view history.
9. **Reset demo** to restore the seeded state.

---

## 4. Technical architecture

```
Browser ──► Next.js 16 (frontend/, App Router)
             │  /api/v1/*  rewritten (same-origin, cookies work) ──► NestJS 12 (backend/) ──► PostgreSQL 18
             │                                                          │  Prisma 7 + SQL migrations
             └─ TanStack Query (server state), Zustand (UI state)       ├─ Rule engine (pure TS, unit tested)
                RHF + Zod (shared schemas)                              ├─ PropertyDataProvider (demo adapter)
                                                                        └─ Local file storage for evidence (volume)
shared/ ── Zod schemas, inferred types, API contracts, constants (ESM, no framework imports)
```

Key decisions (see MEMORY.md §5 for the full log):

- **NestJS 12 is ESM-only** and ships a `StandardSchemaValidationPipe`; Zod 4 implements Standard Schema, so the API
  validates request bodies with the **same shared Zod schemas** via `@Body({ schema })` — no adapter library.
- **Prisma 7.10.1** (owner's choice; replaced the initial Drizzle setup on 2026-10-26): `prisma-client` generator
  emitting ESM into `backend/src/generated/prisma`, `@prisma/adapter-pg` driver adapter, SQL migrations in
  `backend/prisma/migrations`, a one-shot `migrate` container. Integration tests run on real PostgreSQL in throwaway
  schemas.
- **Same-origin API via Next rewrites** → `httpOnly` `SameSite=Lax` cookie auth with no CORS credential juggling.
- **Rule engine computed on read** (deterministic from setup + measurements + evidence + material selections); only
  passport snapshots are persisted as immutable records.
- **Tailwind CSS v4** with design tokens in `@theme`; styling lives in `components/ui/*` primitives so it can be
  replaced later without touching data/logic code.

### Data model

`users`, `properties` (GreenForce ID, jurisdiction, address, parcel id, jsonb intelligence, overlays, source),
`projects` (owner, property, name, jurisdiction, jsonb setup, jsonb measurements), `evidence` (rule, requirement,
kind, source upload|catalog, file metadata, sha256, verified), `suppliers`, `materials`, `project_materials`,
`passport_snapshots` (version, fingerprint, previous fingerprint, jsonb content), `audit_events`.

### REST API (`/api/v1`, OpenAPI at `/api/docs`)

| Method & path                                                                                                                                            | Purpose                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `GET /health`                                                                                                                                            | Liveness + DB check                                      |
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`                                                                                                | Session                                                  |
| `GET /properties/search?jurisdiction&q`                                                                                                                  | Address candidates from provider                         |
| `GET /projects` · `POST /projects` · `GET /projects/:id`                                                                                                 | Projects (creation resolves property server-side)        |
| `PUT /projects/:id/setup` · `PUT /projects/:id/measurements`                                                                                             | Declared characteristics / design data                   |
| `GET /projects/:id/compliance`                                                                                                                           | Edition, rule evaluations, verdicts, readiness, fix list |
| `GET/POST /projects/:id/evidence`, `POST …/evidence/link-material`, `PATCH …/evidence/:eid/verify`, `DELETE …/evidence/:eid`, `GET …/evidence/:eid/file` | Evidence                                                 |
| `GET /materials` · `GET /projects/:id/materials` · `POST/DELETE /projects/:id/materials/:mid`                                                            | Catalog, recommendations, selection                      |
| `GET /projects/:id/funding`                                                                                                                              | Funding programs                                         |
| `GET /projects/:id/passport` · `GET/POST /projects/:id/passport/snapshots` · `GET …/snapshots/:version`                                                  | Passport                                                 |
| `GET /projects/:id/history`                                                                                                                              | Audit trail                                              |
| `POST /demo/reset`                                                                                                                                       | Restore seed data (only when `DEMO_MODE=true`)           |

Error shape (shared `ApiErrorSchema`): `{ statusCode, error, message, details? }`.

---

## 5. Monorepo structure

```
frontend/       Next.js app + frontend/Dockerfile          (@greenforce/frontend)
backend/        NestJS API + Prisma + backend/Dockerfile   (@greenforce/backend)
shared/         Zod schemas/types/contracts                (@greenforce/shared, built to dist, ESM exports)
docs/           roadmap + progress
.github/workflows ci.yml, deploy.yml (template)
docker-compose.yml (postgres, migrate, backend, frontend)
```

---

## 6. Dependency & compatibility plan (verified 2026-10-26 with `npm view`)

| Area                                             | Choice                                                                           | Why not newest                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Node                                             | **26 LTS (Lithium)** for Docker/CI since 2026-11-02 (was 24 LTS); engines `>=24` | Node 26 entered Active LTS in late Oct 2026                                                 |
| TypeScript                                       | **6.0.x**                                                                        | TS 7.0 is out, but `typescript-eslint` requires `<6.1` and `@nestjs/swagger` `^5.5 \|\| ^6` |
| ESLint                                           | **9.39.x**                                                                       | ESLint 10 unsupported by `eslint-plugin-react/import/jsx-a11y` used by `eslint-config-next` |
| Next / React                                     | 16.4.x / 19.3.x                                                                  | —                                                                                           |
| Tailwind                                         | 4.3.x (`@tailwindcss/postcss`)                                                   | —                                                                                           |
| TanStack Query / Zustand / Zod / RHF / resolvers | 5.105 / 5.0 / 4.6 / 7.91 / 5.9                                                   | —                                                                                           |
| NestJS                                           | 12.2 (+ swagger 12.0, platform-express)                                          | —                                                                                           |
| ORM                                              | Prisma 7.10.1 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`)                 | The CLI's npm `latest` tag is an 8.0 RC                                                     |
| Tests                                            | Vitest 5 (+ unplugin-swc for Nest decorators), Testing Library, Playwright       | —                                                                                           |
| DB image                                         | `postgres:18.6-alpine3.24`                                                       | 19 is RC                                                                                    |
| Node image                                       | `node:24.22-alpine3.24`                                                          | —                                                                                           |

---

## 7. Phased roadmap, commit plan and acceptance criteria

> The user performs all commits. Each phase ends with a suggested conventional-commit message.
> Order adapted from the master prompt: the root workspace is created first so a single lockfile exists from day one.

| Phase | Content                                                                                                           | Suggested commit                                                                              | Acceptance criteria                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1     | Requirements, roadmap, MEMORY.md                                                                                  | `docs: define MVP scope and implementation roadmap`                                           | Docs exist and reflect the brief                                      |
| 2     | Root workspaces, tsconfig base, ESLint, Prettier, ignore files, env example                                       | `build(monorepo): configure npm workspaces and shared tooling`                                | `npm install` creates one root lockfile; `npm run format:check` works |
| 3     | `shared/` schemas/types/contracts/constants + tests                                                               | `feat(shared): add reusable schemas and API contracts`                                        | Builds to dist; vitest passes; importable by name                     |
| 4     | API foundation: config, logging, errors, health, swagger, DB + migrations                                         | `feat(api): initialize NestJS backend foundation`                                             | Build/lint/typecheck/tests pass; `/api/v1/health` OK                  |
| 5     | API domain: auth, properties, projects, rules engine, evidence, materials, funding, passport, history, seed/reset | `feat(api): implement compliance domain modules` + `test(api): cover core business workflows` | Unit tests for engine + integration tests on PostgreSQL pass          |
| 6     | Web foundation: Next app, Tailwind tokens, UI primitives, API client, Query, Zustand, auth proxy                  | `feat(web): initialize Next.js frontend foundation`                                           | Build passes; styles applied                                          |
| 7     | Web features: all journey screens wired to API                                                                    | `feat(web): implement primary compliance workflows`                                           | Journeys 1–9 work against running API                                 |
| 8     | E2E verification + demo polish                                                                                    | `test(mvp): verify core application workflows`                                                | Playwright happy path passes against local stack                      |
| 9     | Docker + Compose                                                                                                  | `build(docker): containerize the MVP`                                                         | `docker compose up --build` serves web+api+db, seed runs              |
| 10    | GitHub Actions CI + deploy template                                                                               | `ci(github): add automated checks and deployment workflow`                                    | Every workflow command maps to a real script                          |
| 11    | README, final verification, docs sync                                                                             | `docs: document setup and investor demo`                                                      | Full verification suite run and reported                              |

---

## 8. Assumptions & open questions

Assumptions (defaults chosen; change on request):

1. Auth is required at MVP level (demo accounts, no sign-up).
2. Live registry integrations are not available → demo adapter with fixtures, labelled in UI and docs.
3. Danish regulatory thresholds demonstrate public summaries of BR18. Germany uses a documentation checklist and user-declared design targets — **not legal advice**.
4. Funding programs modelled for Denmark only (Landsbyggefonden), per the brief; DE shows an honest empty state.
5. Evidence files are stored on a local volume (S3-compatible storage is a future step).
6. English UI; Danish terms shown alongside where helpful (e.g. "Etagebolig").

Open questions for the product owner:

- Which real data sources/credentials will be available after MVP (Datafordeler, German cadastral and municipal registries)?
- Who signs/attests the formal passport statement (contractor only, or third-party reviewer)?
- Preferred hosting provider for deployment (template is provider-neutral, container-registry based).
