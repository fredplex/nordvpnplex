#!/usr/bin/env bash
set -euo pipefail

# Queries the NordVPN Debian package pool and prints version information.
# Run from anywhere.
# Usage:
#   bash scripts/get-latest-version.sh         # Prints only the latest version (e.g. "5.1.0")
#   bash scripts/get-latest-version.sh --all   # Prints all sorted versions, one per line

REPO_URL="https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/"

AVAILABLE=$(curl -sf "${REPO_URL}" \
  | grep -oE 'nordvpn_[0-9]+\.[0-9]+\.[0-9]+_amd64\.deb' \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' \
  | sort -V \
  | uniq)

if [[ -z "${AVAILABLE}" ]]; then
  echo "ERROR: Could not fetch or parse versions from ${REPO_URL}" >&2
  exit 1
fi

if [[ "${1:-}" == "--all" ]]; then
  echo "${AVAILABLE}"
else
  echo "${AVAILABLE}" | tail -1
fi
