#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/check-version.sh
# Compares the pinned NordVPN version in Dockerfile against what is
# currently published in the official Debian package repo.
# Run from repo root.

CURRENT="$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")"

echo "Pinned version : ${CURRENT}"
echo ""

# Call get-latest-version.sh with --all to inspect available versions
if ! AVAILABLE="$(bash scripts/get-latest-version.sh --all)"; then
  echo "ERROR: Failed to retrieve version list." >&2
  exit 1
fi

echo "Recent available versions (latest 5):"
echo "${AVAILABLE}" | tail -5 | sed 's/^/  /'

LATEST="$(echo "${AVAILABLE}" | tail -1)"
echo ""

if [[ "${LATEST}" == "${CURRENT}" ]]; then
  echo "Up to date — ${CURRENT} is the latest available."
else
  echo "New version available: ${LATEST}  (currently pinned: ${CURRENT})"
  echo ""
  echo "  To bump, run:"
  echo "    task bump NORDVPN_VERSION=${LATEST} IMAGE_VERSION=<new-image-version>"
fi

