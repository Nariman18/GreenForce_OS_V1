# GreenForce OS frontend (Next.js standalone). Build context: repository root.
#   docker build -f frontend/Dockerfile --build-arg API_INTERNAL_URL=http://backend:4000 .

FROM node:26.13-alpine3.24 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    npm_config_fund=false \
    npm_config_audit=false
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

FROM base AS deps
RUN npm ci --workspace @greenforce/shared --workspace @greenforce/frontend --include-workspace-root

FROM deps AS build
# Next.js rewrites are resolved at build time.
ARG API_INTERNAL_URL=http://backend:4000
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
COPY tsconfig.base.json ./
COPY shared shared
COPY frontend frontend
RUN npm run build -w @greenforce/shared && npm run build -w @greenforce/frontend

FROM node:26.13-alpine3.24 AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:3000/login || exit 1
CMD ["node", "frontend/server.js"]
