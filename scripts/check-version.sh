#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/check-version.sh
# Compares the pinned NordVPN version in Dockerfile against what is
# currently published in the official Debian package repo.
# Run from repo root.

REPO_URL="https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/"
CURRENT="$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")"

echo "Pinned version : ${CURRENT}"
echo "Checking       : ${REPO_URL}"
echo ""

AVAILABLE="$(curl -sf "${REPO_URL}" \
  | grep -oE 'nordvpn_[0-9]+\.[0-9]+\.[0-9]+_amd64\.deb' \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' \
  | sort -V \
  | uniq)"

if [[ -z "${AVAILABLE}" ]]; then
  echo "ERROR: Could not fetch or parse the package list from the repo." >&2
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
