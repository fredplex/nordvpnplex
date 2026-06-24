#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/dev-latest.sh <GIT_HASH>
# Scrapes the NordVPN Debian repo for the newest available version
# and builds a dev image with it. Run from repo root.

REGISTRY="fredplex"
IMAGE="nordvpn"
GIT_HASH="${1:?Usage: bash scripts/dev-latest.sh <GIT_HASH>}"

PINNED_NORD=$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")
PINNED_IMG=$(grep "ARG IMAGE_VERSION" Dockerfile | sed "s/ARG IMAGE_VERSION='//;s/'$//")
LATEST=$(bash scripts/get-latest-version.sh)
IMAGE_VERSION_RESOLVED="${PINNED_IMG}-dev"

echo "Pinned:    ${PINNED_NORD}"
echo "Latest:    ${LATEST}"
echo "Image Ver: ${IMAGE_VERSION_RESOLVED}"
echo ""
echo "Building dev image with NordVPN ${LATEST}..."

docker build --platform linux/amd64 . -f Dockerfile \
  -t "${REGISTRY}/${IMAGE}:dev" \
  -t "${REGISTRY}/${IMAGE}:dev-${GIT_HASH}" \
  -t "${REGISTRY}/${IMAGE}:dev-${LATEST}" \
  -t "${REGISTRY}/${IMAGE}:${IMAGE_VERSION_RESOLVED}" \
  --build-arg="IMAGE_VERSION=${IMAGE_VERSION_RESOLVED}" \
  --build-arg="NORDVPN_VERSION=${LATEST}"

echo ""
echo "Tagged: ${REGISTRY}/${IMAGE}:dev"
echo "Tagged: ${REGISTRY}/${IMAGE}:dev-${GIT_HASH}"
echo "Tagged: ${REGISTRY}/${IMAGE}:dev-${LATEST}"
echo "Tagged: ${REGISTRY}/${IMAGE}:${IMAGE_VERSION_RESOLVED}"
