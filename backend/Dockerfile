# GreenForce OS backend (NestJS + Prisma). Build context: repository root.
#   docker build -f backend/Dockerfile .                  → API runtime (default target)
#   docker build -f backend/Dockerfile --target migrate . → migrations + demo seed job

FROM node:26.13-alpine3.24 AS base
WORKDIR /app
ENV npm_config_fund=false \
    npm_config_audit=false \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# ── All backend dependencies, from the single root lockfile ──────────────────
FROM base AS deps
# Prisma's migration engine detects the OpenSSL version via the openssl binary.
RUN apk add --no-cache openssl
RUN npm ci --workspace @greenforce/shared --workspace @greenforce/backend --include-workspace-root

# ── Build shared → backend (prisma generate + nest build) ────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY shared shared
COPY backend backend
RUN npm run build -w @greenforce/shared && npm run build -w @greenforce/backend

# ── Production dependencies only ─────────────────────────────────────────────
FROM base AS prod-deps
# @prisma/client lists the Prisma CLI and TypeScript as optional peers, which npm flags "devOptional" and only skips
# when dev AND optional are omitted. The runtime needs neither (no native or optional packages are used at runtime).
RUN npm ci --omit=dev --omit=optional --omit=peer --workspace @greenforce/backend --ignore-scripts

# ── Migration job: prisma migrate deploy, then idempotent demo seed ──────────
FROM build AS migrate
ENV NODE_ENV=production \
    PATH=/app/node_modules/.bin:$PATH
RUN mkdir -p backend/uploads node_modules/.cache \
 && chown node:node backend/uploads node_modules/.cache
USER node
WORKDIR /app/backend
CMD ["sh", "-c", "prisma migrate deploy && if [ \"${DEMO_MODE:-false}\" = \"true\" ]; then node dist/db/cli.js seed; fi"]

# ── API runtime (default target) ─────────────────────────────────────────────
FROM node:26.13-alpine3.24 AS runtime
ENV NODE_ENV=production \
    API_PORT=4000 \
    UPLOAD_DIR=/app/backend/uploads
WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
RUN mkdir -p backend/uploads && chown node:node backend/uploads
USER node
WORKDIR /app/backend
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["node", "--enable-source-maps", "dist/main.js"]
