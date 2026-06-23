#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/dev-clean.sh
# Removes local dev images (:dev and :dev-* tags). Run from repo root.

REGISTRY="fredplex"
IMAGE="nordvpn"

echo "Removing local dev images..."

if docker rmi "${REGISTRY}/${IMAGE}:dev" 2>/dev/null; then
  echo "  Removed :dev"
else
  echo "  :dev not found"
fi

DEV_HASHES=$(docker images "${REGISTRY}/${IMAGE}" --filter "reference=${REGISTRY}/${IMAGE}:dev-*" -q 2>/dev/null || true)
if [ -n "${DEV_HASHES}" ]; then
  if echo "${DEV_HASHES}" | xargs -r docker rmi 2>/dev/null; then
    echo "  Removed :dev-* tags"
  else
    echo "  Some :dev-* tags could not be removed"
  fi
else
  echo "  No :dev-* tags found"
fi

echo "Done."
