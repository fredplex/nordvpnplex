#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/dev-build.sh <GIT_HASH> [NORDVPN_VERSION]
# Builds a dev image tagged :dev and :dev-<hash>.
# If NORDVPN_VERSION is provided, overrides the Dockerfile default.
# Run from repo root.

REGISTRY="fredplex"
IMAGE="nordvpn"
GIT_HASH="${1:?Usage: bash scripts/dev-build.sh <GIT_HASH> [NORDVPN_VERSION]}"
NORDVPN_VERSION="${2:-}"

if [ -n "${NORDVPN_VERSION}" ]; then
  echo "Dev build — NordVPN override: ${NORDVPN_VERSION}"
  docker build --platform linux/amd64 . -f Dockerfile \
    -t "${REGISTRY}/${IMAGE}:dev" \
    -t "${REGISTRY}/${IMAGE}:dev-${GIT_HASH}" \
    --build-arg="IMAGE_VERSION=dev-${GIT_HASH}" \
    --build-arg="NORDVPN_VERSION=${NORDVPN_VERSION}"
else
  echo "Dev build — using pinned NordVPN version from Dockerfile"
  docker build --platform linux/amd64 . -f Dockerfile \
    -t "${REGISTRY}/${IMAGE}:dev" \
    -t "${REGISTRY}/${IMAGE}:dev-${GIT_HASH}" \
    --build-arg="IMAGE_VERSION=dev-${GIT_HASH}"
fi

echo ""
echo "Tagged: ${REGISTRY}/${IMAGE}:dev"
echo "Tagged: ${REGISTRY}/${IMAGE}:dev-${GIT_HASH}"
