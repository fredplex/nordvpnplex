#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION> [CHANGELOG_SUMMARY]
# Edits all version-pinned files (Dockerfile, README.md Changelog) in one shot.
# Run from repo root.
# Does NOT commit, tag, build, or push — human reviews diff and proceeds manually.
#
# CHANGELOG_SUMMARY (optional): free-text reason for the bump, used in the
# auto-appended README Changelog entry (e.g. "ship container startup version logs").
# Without it, an image-only bump defaults to "Base image refresh" wording — correct
# for the automated monthly base flow, wrong for feature/fix bumps, so pass a
# summary when bumping to ship container changes.
#
# This script does NOT touch .ai/current.md. That handoff doc is maintained by
# humans/agents during PR review and session close — it is narrative state, not a
# generated artifact. The pinned versions live in the Dockerfile
# (ARG NORDVPN_VERSION / ARG IMAGE_VERSION) — the single source of truth.

NORDVPN_VERSION="${1:?Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION> [CHANGELOG_SUMMARY]}"
IMAGE_VERSION="${2:?Usage: bash scripts/bump.sh <NORDVPN_VERSION> <IMAGE_VERSION> [CHANGELOG_SUMMARY]}"
CHANGELOG_OVERRIDE="${3:-}"
TODAY="$(date +%Y-%m-%d)"
REPO_URL="https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/"

# Validate semver format
[[ "$NORDVPN_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "ERROR: NORDVPN_VERSION '${NORDVPN_VERSION}' must be x.y.z format" >&2; exit 1
}
[[ "$IMAGE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "ERROR: IMAGE_VERSION '${IMAGE_VERSION}' must be x.y.z format" >&2; exit 1
}

# Refuse to proceed if key files carry leftover unresolved merge conflict markers —
# a blind sed on a broken file silently perpetuates the break instead of failing loudly.
# CLAUDE.md is no longer edited by this script, but stays in the check as a
# corruption tripwire (it is where markers went unnoticed for a week in 2026-07).
for f in Dockerfile README.md CLAUDE.md; do
  if grep -qE '^(<{7}|={7}|>{7})' "$f"; then
    echo "ERROR: ${f} has unresolved merge conflict markers — refusing to edit." >&2
    exit 1
  fi
done

# Capture the outgoing versions before anything is edited, so the changelog
# entry below can describe what actually changed (NordVPN bump vs. base-image-only).
OLD_NORDVPN="$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")"
OLD_IMAGE="$(grep "ARG IMAGE_VERSION" Dockerfile | sed "s/ARG IMAGE_VERSION='//;s/'$//")"
if [[ -n "${CHANGELOG_OVERRIDE}" ]]; then
  if [[ "${OLD_NORDVPN}" != "${NORDVPN_VERSION}" ]]; then
    CHANGELOG_SUMMARY="Image ${OLD_IMAGE} → ${IMAGE_VERSION} — ${CHANGELOG_OVERRIDE} (NordVPN ${OLD_NORDVPN} → ${NORDVPN_VERSION})"
  else
    CHANGELOG_SUMMARY="Image ${OLD_IMAGE} → ${IMAGE_VERSION} — ${CHANGELOG_OVERRIDE} (NordVPN unchanged at ${NORDVPN_VERSION})"
  fi
elif [[ "${OLD_NORDVPN}" != "${NORDVPN_VERSION}" ]]; then
  CHANGELOG_SUMMARY="NordVPN ${OLD_NORDVPN} → ${NORDVPN_VERSION} (image ${OLD_IMAGE} → ${IMAGE_VERSION})"
else
  CHANGELOG_SUMMARY="Base image refresh — image ${OLD_IMAGE} → ${IMAGE_VERSION} (NordVPN unchanged at ${NORDVPN_VERSION})"
fi

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

# 2. README.md — auto-append a Changelog entry (newest first)
sed -i "/^## Changelog\$/{n; a\\
- **${TODAY}** — ${CHANGELOG_SUMMARY}
}" README.md

echo "All files updated. Review the diff before committing:"
echo ""
git diff
echo ""
echo "Reminder: update .ai/current.md by hand to reflect this bump (handoff state)."
