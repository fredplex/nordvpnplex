#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/dev-latest.sh <GIT_HASH>
# Scrapes the NordVPN Debian repo for the newest available version
# and builds a dev image with it. Run from repo root.

REGISTRY="fredplex"
IMAGE="nordvpn"
GIT_HASH="${1:?Usage: bash scripts/dev-latest.sh <GIT_HASH>}"

PINNED=$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")
LATEST=$(bash scripts/get-latest-version.sh)


echo "Pinned:    ${PINNED}"
echo "Latest:    ${LATEST}"
echo ""
echo "Building dev image with NordVPN ${LATEST}..."

docker build --platform linux/amd64 . -f Dockerfile \
  -t "${REGISTRY}/${IMAGE}:dev" \
  -t "${REGISTRY}/${IMAGE}:dev-${GIT_HASH}" \
  --build-arg="IMAGE_VERSION=dev-${GIT_HASH}" \
  --build-arg="NORDVPN_VERSION=${LATEST}"

echo ""
echo "Tagged: ${REGISTRY}/${IMAGE}:dev"
echo "Tagged: ${REGISTRY}/${IMAGE}:dev-${GIT_HASH}"
