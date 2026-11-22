#!/bin/sh
# Runs on the Docker host (invoked by .github/workflows/deploy.yml) inside DEPLOY_PATH.
#   IMAGE_REGISTRY=ghcr.io/<owner> IMAGE_TAG=sha-<commit> sh remote-deploy.sh
# 1. pulls the new images, 2. runs the migrate job, 3. rolls out backend + frontend and waits for health checks.
# If step 3 fails, the previously deployed tag is restored. Migrations are not rolled back — keep schema changes
# backward compatible (expand → migrate code → contract) so the previous release still runs on the new schema.
set -eu

: "${IMAGE_REGISTRY:?IMAGE_REGISTRY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

if [ ! -f backend.env ]; then
  echo "backend.env is missing in $(pwd) — copy deploy/backend.env.example and fill in real values." >&2
  exit 1
fi

PREVIOUS_TAG=$(cat .deployed-tag 2>/dev/null || true)

# Persist the selection in .env (for manual `docker compose` use on the host) AND export it: variables in the
# environment take precedence over .env, so the export is what makes a rollback actually switch images.
use_tag() {
  IMAGE_TAG="$1"
  export IMAGE_TAG
  {
    echo "IMAGE_REGISTRY=${IMAGE_REGISTRY}"
    echo "IMAGE_TAG=${IMAGE_TAG}"
    echo "COMPOSE_PROFILES=${COMPOSE_PROFILES-bundled-db}"
  } > .env
}

NEW_TAG="$IMAGE_TAG"
use_tag "$NEW_TAG"
echo "→ pulling ${IMAGE_REGISTRY}/*:${IMAGE_TAG}"
docker compose pull --quiet

echo "→ applying database migrations"
docker compose run --rm migrate

echo "→ rolling out backend and frontend"
if docker compose up --detach --wait --wait-timeout 180 --remove-orphans backend frontend; then
  echo "$NEW_TAG" > .deployed-tag
  docker image prune --force --filter "until=168h" > /dev/null
  echo "✓ deployed ${NEW_TAG} (previous: ${PREVIOUS_TAG:-none})"
  exit 0
fi

echo "✗ rollout of ${NEW_TAG} failed" >&2
docker compose logs --no-color --tail 100 backend frontend >&2 || true
if [ -n "$PREVIOUS_TAG" ]; then
  echo "↩ restoring ${PREVIOUS_TAG}" >&2
  use_tag "$PREVIOUS_TAG"
  docker compose up --detach --wait --wait-timeout 180 backend frontend || echo "✗ rollback also failed" >&2
fi
exit 1
