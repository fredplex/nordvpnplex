#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION>
# Edits all version-pinned files in one shot. Run from repo root.
# Does NOT commit, tag, build, or push — human reviews diff and proceeds manually.
#
# When run in CI (CI=true), .ai/current.md is set to "pending" state.
# When run locally, .ai/current.md is set to "complete" state.

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

# 4. .ai/current.md — content differs based on context
if [[ "${CI:-false}" == "true" ]]; then
  # Automated PR context: owner hasn't built yet
  cat > .ai/current.md << HEREDOC
# Current Session State

## Status
Pending build — NordVPN ${NORDVPN_VERSION} bump opened as draft PR

## Last Action
Automated PR opened on ${TODAY} for NordVPN ${NORDVPN_VERSION} / image ${IMAGE_VERSION}.

## Next Action
1. Review and merge PR auto/nordvpn-${NORDVPN_VERSION} (confirm IMAGE_VERSION first)
2. Run: task docker-build && task verify
3. git tag -a ${IMAGE_VERSION} -m "bump to NordVPN ${NORDVPN_VERSION}" && git push --tags

## Open Issues
- None
HEREDOC
else
  # Local context: owner has built and verified
  cat > .ai/current.md << HEREDOC
# Current Session State

## Status
Idle / Up to date at NordVPN ${NORDVPN_VERSION}

## Last Action
Built and verified ${NORDVPN_VERSION} on ${TODAY}. Pushed as \`fredplex/nordvpn:${IMAGE_VERSION}\` + \`:latest\`.

## Next Action
Watch for NordVPN next release. Run version-bump workflow when available.

## Open Issues
- None
HEREDOC
fi

echo "All files updated. Review the diff before committing:"
echo ""
git diff
