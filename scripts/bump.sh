#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION>
# Edits all version-pinned files in one shot. Run from repo root.
# Does NOT commit, tag, build, or push — human reviews diff and proceeds manually.
#
# This script does NOT touch .ai/current.md. That handoff doc is maintained by
# humans/agents during PR review and session close — it is narrative state, not a
# generated artifact. The pinned version lives in CLAUDE.md (updated below).

NORDVPN_VERSION="${1:?Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION>}"
IMAGE_VERSION="${2:?Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION>}"
TODAY="$(date +%Y-%m-%d)"
REPO_URL="https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/"

# Validate semver format
[[ "$NORDVPN_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "ERROR: NORDVPN_VERSION '${NORDVPN_VERSION}' must be x.y.z format" >&2; exit 1
}
[[ "$IMAGE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "ERROR: IMAGE_VERSION '${IMAGE_VERSION}' must be x.y.z format" >&2; exit 1
}

# Verify the package exists before editing anything
echo "Verifying nordvpn_${NORDVPN_VERSION}_amd64.deb in the official repo..."
if ! curl -sf "${REPO_URL}" | grep -qF "nordvpn_${NORDVPN_VERSION}_amd64.deb"; then
  echo "ERROR: Package not found at ${REPO_URL}" >&2
  echo "       Check https://nordvpn.com/blog/nordvpn-linux-release-notes/ for available versions." >&2
  exit 1
fi
echo "Package confirmed. Applying changes..."
echo ""

# 1. Dockerfile
sed -i "s#ARG NORDVPN_VERSION='[^']*'#ARG NORDVPN_VERSION='${NORDVPN_VERSION}'#" Dockerfile
sed -i "s#ARG IMAGE_VERSION='[^']*'#ARG IMAGE_VERSION='${IMAGE_VERSION}'#" Dockerfile

# 2. README.md — machine-readable comment + human-readable line
sed -i "s#<!-- current-version:.*-->#<!-- current-version: nordvpn=${NORDVPN_VERSION} image=${IMAGE_VERSION} -->#" README.md
sed -i "s#> \*\*Current image:\*\*.*#> **Current image:** fredplex/nordvpn:${IMAGE_VERSION} — NordVPN ${NORDVPN_VERSION}#" README.md

# 3. CLAUDE.md — pinned version block
sed -i "s#NordVPN: .*  |  Image tag: .*  |  Built: .*#NordVPN: ${NORDVPN_VERSION}  |  Image tag: fredplex/nordvpn:${IMAGE_VERSION}  |  Built: ${TODAY}#" CLAUDE.md

echo "All files updated. Review the diff before committing:"
echo ""
git diff
echo ""
echo "Reminder: update .ai/current.md by hand to reflect this bump (handoff state)."
