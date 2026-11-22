# CI/CD pipeline

Three workflows plus Dependabot. Images are built **once** per commit and the same images are promoted from staging
to production.

```
pull request / develop / merge queue ──► CI ──► ci-success (required check)

push to main ──► Release: CI ─► publish 3 images to GHCR (sha-<commit>, main) ─► Deploy → staging
push tag v1.2.3 ─► Release: CI ─► publish (sha-<commit>, 1.2.3, 1.2, latest) ─► Deploy → production (approval)

Actions → Deploy (manual) ─► any environment, any published tag  (redeploy / rollback)
```

## What CI checks (`.github/workflows/ci.yml`)

| Job             | What it does                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow-lint` | actionlint (+ shellcheck) on every workflow                                                                                                                      |
| `quality`       | Prettier, ESLint, TypeScript (shared, backend incl. generated Prisma client, frontend)                                                                           |
| `test`          | PostgreSQL 18 service: `prisma migrate deploy` on an empty DB, **schema drift check** (`db:check`), all unit + integration tests                                 |
| `build`         | shared → backend (prisma generate + nest build) → frontend (next build)                                                                                          |
| `security`      | `npm audit`: production deps fail on moderate+, all deps fail on high+                                                                                           |
| `e2e`           | `docker compose up --build --wait` (postgres → migrate → backend → frontend), Playwright journey, Trivy scan of both images (HIGH/CRITICAL with a fix available) |
| `ci-success`    | Aggregates every job — the only check branch protection needs                                                                                                    |

Throwaway secrets are generated per run; nothing is stored.

## Releases (`.github/workflows/release.yml`)

- Runs the full CI first (`workflow_call`), then builds `greenforce-api`, `greenforce-api-migrate` and
  `greenforce-web` with provenance and SBOM attached, pushing to `ghcr.io/<owner>/…`.
- `main` → deploys `sha-<commit>` to **staging**. Tag `vX.Y.Z` → deploys the same `sha-<commit>` images to
  **production** (tags are only extra names for images CI already tested).

To release: merge to `main`, check staging, then `git tag v1.0.0 && git push origin v1.0.0`.

## Deploys (`.github/workflows/deploy.yml` + `deploy/`)

On the target host the workflow copies `deploy/docker-compose.prod.yml` and `deploy/remote-deploy.sh`, then:

1. pulls the images for the tag,
2. runs the one-shot `migrate` container (`prisma migrate deploy`, demo seed only if `DEMO_MODE=true`),
3. starts backend + frontend and waits for their health checks,
4. on failure restores the previously deployed tag automatically (verified locally: a broken release is rolled back
   and the old version is healthy again),
5. smoke-tests `PUBLIC_URL/api/v1/health` and `/login`.

Migrations are not rolled back, so keep schema changes backward compatible (add → deploy code → remove later).
Until `DEPLOY_HOST` is set for an environment, the deploy job is **skipped with a notice** — the pipeline stays green
while images are still published.

**Rollback / redeploy:** Actions → _Deploy_ → Run workflow → environment + an older tag (e.g. `sha-<commit>` or
`1.2.0`).

## One-time setup

### GitHub repository

1. **Branch protection** for `main` (and `develop`): require pull requests and the status check `ci-success`;
   optionally enable the merge queue.
2. **Environments** (Settings → Environments): create `staging` and `production`. On `production` add
   _Required reviewers_ and restrict deployments to tags `v*`.
3. Per environment, **variables**: `DEPLOY_HOST`, `DEPLOY_USER` (default `deploy`), `DEPLOY_PATH` (default
   `/opt/greenforce`), `PUBLIC_URL`; **secrets**: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <host>`), and
   `GHCR_PULL_TOKEN` (a token with `read:packages`) if the packages are private.
4. Nothing else: workflows use the built-in `GITHUB_TOKEN` with least privilege (`contents: read`, plus
   `packages: write` only in the publish job).

### Docker host (per environment)

1. A Linux VM with Docker Engine + Compose v2; a `deploy` user in the `docker` group with the public half of
   `DEPLOY_SSH_KEY` in `~/.ssh/authorized_keys`.
2. `sudo mkdir -p /opt/greenforce && sudo chown deploy /opt/greenforce`.
3. Copy `deploy/backend.env.example` to `/opt/greenforce/backend.env`, fill in **real** secrets, `chmod 600`.
   Use `DEMO_MODE=true` only for demo environments.
4. A TLS reverse proxy (Caddy, nginx, cloud load balancer) forwarding your domain to `127.0.0.1:3000`. Example Caddy:
   `greenforce.example.com { reverse_proxy 127.0.0.1:3000 }`.
5. Managed PostgreSQL instead of the bundled container: set `DATABASE_URL` in `backend.env` and
   `COMPOSE_PROFILES=` (empty) in the environment of the deploy script, or edit `.env` on the host.

## Dependency updates (`.github/dependabot.yml`)

Weekly PRs (Mondays) for npm, GitHub Actions, Dockerfile base images and compose images, grouped so related packages
move together (e.g. one PR for `tailwindcss` + `@tailwindcss/postcss`, one for Next.js + React). Every update PR runs
the full CI. Majors known to be blocked are held back: TypeScript 7 (typescript-eslint, @nestjs/swagger), ESLint 10
(eslint-config-next plugins), `@types/node` majors (kept on the Node LTS line in `.nvmrc`).

### Keeping Tailwind CSS on the latest version

Tailwind is configured the v4 way — no `tailwind.config.js`: `frontend/postcss.config.mjs` loads `@tailwindcss/postcss`
and `frontend/src/app/globals.css` starts with `@import 'tailwindcss'` and holds the design tokens in `@theme`.

- Minor/patch releases arrive as the Dependabot `tailwind` group PR; merge when CI is green.
- Manually: `npm install -w @greenforce/frontend tailwindcss@latest @tailwindcss/postcss@latest`, then
  `npm run verify`.
- A future major version: run the official codemod from the frontend folder (`npx @tailwindcss/upgrade`), review
  the diff, then `npm run verify` and check the screens.
