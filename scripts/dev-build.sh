#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/dev-build.sh <GIT_HASH> [NORDVPN_VERSION]
# Builds a dev image tagged :dev, :dev-<hash>, :dev-<version>, and :<image_version>-dev.
# If NORDVPN_VERSION is provided, overrides the Dockerfile default.
# Run from repo root.

REGISTRY="fredplex"
IMAGE="nordvpn"
GIT_HASH="${1:?Usage: bash scripts/dev-build.sh <GIT_HASH> [NORDVPN_VERSION]}"
NORDVPN_VERSION="${2:-}"

PINNED_NORD=$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")
PINNED_IMG=$(grep "ARG IMAGE_VERSION" Dockerfile | sed "s/ARG IMAGE_VERSION='//;s/'$//")

NORDVPN_VERSION_RESOLVED="${NORDVPN_VERSION:-${PINNED_NORD}}"
IMAGE_VERSION_RESOLVED="${PINNED_IMG}-dev"

echo "Dev build — NordVPN: ${NORDVPN_VERSION_RESOLVED}"
echo "Dev build — Image Version: ${IMAGE_VERSION_RESOLVED}"

docker build --platform linux/amd64 . -f Dockerfile \
  -t "${REGISTRY}/${IMAGE}:dev" \
  -t "${REGISTRY}/${IMAGE}:dev-${GIT_HASH}" \
  -t "${REGISTRY}/${IMAGE}:dev-${NORDVPN_VERSION_RESOLVED}" \
  -t "${REGISTRY}/${IMAGE}:${IMAGE_VERSION_RESOLVED}" \
  --build-arg="IMAGE_VERSION=${IMAGE_VERSION_RESOLVED}" \
  --build-arg="NORDVPN_VERSION=${NORDVPN_VERSION_RESOLVED}"

echo ""
echo "Tagged: ${REGISTRY}/${IMAGE}:dev"
echo "Tagged: ${REGISTRY}/${IMAGE}:dev-${GIT_HASH}"
echo "Tagged: ${REGISTRY}/${IMAGE}:dev-${NORDVPN_VERSION_RESOLVED}"
echo "Tagged: ${REGISTRY}/${IMAGE}:${IMAGE_VERSION_RESOLVED}"

