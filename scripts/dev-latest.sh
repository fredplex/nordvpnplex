#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/dev-latest.sh <GIT_HASH>
# Scrapes the NordVPN Debian repo for the newest available version
# and builds a dev image with it. Run from repo root.

REGISTRY="fredplex"
IMAGE="nordvpn"
GIT_HASH="${1:?Usage: bash scripts/dev-latest.sh <GIT_HASH>}"
REPO_URL="https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/"

PINNED=$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")
LATEST=$(curl -sf "${REPO_URL}" \
  | grep -oE 'nordvpn_[0-9]+\.[0-9]+\.[0-9]+_amd64\.deb' \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' \
  | sort -V | uniq | tail -1)

if [ -z "${LATEST}" ]; then
  echo "ERROR: Could not fetch version list from ${REPO_URL}" >&2
  exit 1
fi

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
