# Plan: Base Image Refresh Cadence

**Status**: In progress (Phase A complete)  
**Branch**: `chore/base-image-refresh-plan`  
**Date**: 2026-06-27

---

## Versioning Model (clarified)

`IMAGE_VERSION` tracks the **container**, not the NordVPN client. Any rebuild for any reason — base image refresh, security fix, config bug, NordVPN client bump — produces a new `IMAGE_VERSION`. The changelog entry explains what changed. This means a base image refresh is a first-class release event, identical in process to a NordVPN version bump.

---

## Problem Statement

The Dockerfile pins the base image to a specific digest:

```dockerfile
FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@sha256:53411508a50bf477f04e4f1e26be432f81f0226f52a134bb1f491ecc61b793d2
```

The pin was set on 2026-06-26. Since then — and going forward — linuxserver.io periodically releases updated versions of `baseimage-ubuntu:noble` that include:

- Ubuntu Noble security patches (kernel headers, glibc, openssl, ca-certificates, etc.)
- s6-overlay updates
- linuxserver-specific hardening and fixes

There is currently **no mechanism** to detect when a new digest is available for the `noble` tag. The existing `check-nordvpn-release.yml` workflow handles NordVPN version detection but has no base-image equivalent.

**The `apt-get upgrade -y` in the Dockerfile partially compensates** — it patches packages installed *into* the image at build time. But it cannot update packages baked into the base image layers themselves (s6-overlay binaries, base OS libs installed at base-image build time). These only change when the base image digest changes.

---

## Current State Audit

| Concern | Current behavior | Gap |
|---|---|---|
| NordVPN version detection | Daily GHA cron → draft PR | Covered |
| Base image security patches | `apt-get upgrade -y` at build time | Partial — intra-layer packages only |
| Base image digest staleness | Manual, ad-hoc | **Not covered** |
| Local digest check | None | **Not covered** |
| Automated drift detection | None | **Not covered** |

### Why the digest pin exists

The pin was added in Phase 3 of Dockerfile optimization to make "never bump the base without explicit instruction" enforceable in code, not just in docs — any base change is a deliberate, visible, human-reviewed act. This plan preserves that gate while adding automation to detect drift.

---

## Owner Decisions — All Resolved

| # | Decision | Answer |
|---|---|---|
| D1 | Cron cadence | **Monthly** (1st of each month, 09:00 UTC) |
| D2 | Auto-trigger dev build on new digest? | **Yes** — same pattern as NordVPN checker |
| D3 | Pair base bump with `IMAGE_VERSION` increment? | **Yes, always** — base refresh is a first-class release; version bump + full publish pipeline fires on merge |
| D4 | Approve `task check-base` Taskfile entry? | **Yes** |
| D5 | Reconsider `apt-get upgrade -y`? | Deferred — revisit after first successful monthly refresh |

### D3 rationale

`IMAGE_VERSION` is the container version, not the NordVPN version. A base image refresh is as valid a release trigger as a NordVPN client bump. Without a version increment:
- Docker Hub `:latest` silently changes content with no signal to users
- Users pinning to a specific tag never receive the updated base
- The GitHub Releases notification system (Watch → Custom → Releases) does not fire
- The changelog has no entry for the security patch

The draft PR produced by the checker will apply `bump.sh` with the same `NORDVPN_VERSION` and an auto-incremented `IMAGE_VERSION` (patch +1), exactly mirroring the NordVPN checker's pattern. The merge-to-main path in `publish.yml` detects the version change and fires the production release normally — no manual `task bump` step needed.

Exception: if a NordVPN version bump coincides with a base image update, both changes land in one PR and one release.

---

## Implementation Phases

> No phase begins without explicit owner approval for that phase. Phases A–D are all approved per the decisions above; Phase C (Taskfile) is explicitly approved under D4.

### Phase A — `scripts/check-base-image.sh`

**Scope**: New diagnostic script only.  
**Files**: `scripts/check-base-image.sh` (new)  
**Risk**: Zero — read-only, no side effects.

**Mechanism**: `docker buildx imagetools inspect` resolves the multi-architecture manifest index digest for the `noble` tag without pulling the image. This is the same digest format used in the `FROM` line. Already available since buildx is a CI dependency.

**Script outline**:
```bash
#!/usr/bin/env bash
set -euo pipefail
# Compare pinned base image digest in Dockerfile vs latest published digest.
# Run from repo root. Requires: docker buildx

IMAGE="ghcr.io/linuxserver/baseimage-ubuntu:noble"
PINNED=$(grep "^FROM" Dockerfile | sed 's/.*@//')

echo "Checking : ${IMAGE}"
echo "Pinned   : ${PINNED}"

LATEST=$(docker buildx imagetools inspect "${IMAGE}" \
  --format '{{.Manifest.Digest}}')

echo "Latest   : ${LATEST}"
echo ""

if [[ "${PINNED}" == "${LATEST}" ]]; then
  echo "Up to date — base image digest is current."
else
  echo "Base image update available!"
  echo ""
  echo "Review linuxserver.io release notes before bumping:"
  echo "  https://github.com/linuxserver/docker-baseimage-ubuntu/releases"
  echo ""
  echo "To bump, run the GHA workflow or update Dockerfile line 1 to:"
  echo "  FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@${LATEST}"
fi
```

---

### Phase B — `.github/workflows/check-base-image.yml`

**Scope**: New GHA workflow.  
**Files**: `.github/workflows/check-base-image.yml` (new)  
**Risk**: Low — draft PR gate, no auto-merge.

**Flow** (mirrors `check-nordvpn-release.yml` exactly):
1. Resolve latest digest for `noble` tag
2. Compare against pinned digest in Dockerfile
3. If match → log "up to date", exit 0
4. If mismatch → calculate `IMAGE_VERSION` patch +1, run `bump.sh` (updates Dockerfile + README.md + CLAUDE.md), update digest in Dockerfile, trigger dev build via `publish-dev.yml`, open draft PR

The draft PR is merge-ready: it contains the digest change, the `IMAGE_VERSION` increment, and a pre-built dev image for the owner to pull on Unraid. Merging fires the `publish.yml` version-change path, producing a new `:latest` and `:<IMAGE_VERSION>` on Docker Hub.

**Workflow outline**:
```yaml
name: Check Base Image

on:
  schedule:
    - cron: '0 9 1 * *'   # Monthly, 1st of each month at 09:00 UTC
  workflow_dispatch:

jobs:
  check-base:
    runs-on: ubuntu-latest
    outputs:
      update_available: ${{ steps.check.outputs.update_available }}
      pinned_digest:    ${{ steps.check.outputs.pinned }}
      latest_digest:    ${{ steps.check.outputs.latest }}
      current_image_version:   ${{ steps.image_version.outputs.current }}
      suggested_image_version: ${{ steps.image_version.outputs.suggested }}
      current_nordvpn_version: ${{ steps.nordvpn_version.outputs.current }}

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Resolve digests
        id: check
        run: |
          PINNED=$(grep "^FROM" Dockerfile | sed 's/.*@//')
          LATEST=$(docker buildx imagetools inspect \
            ghcr.io/linuxserver/baseimage-ubuntu:noble \
            --format '{{.Manifest.Digest}}')
          echo "pinned=${PINNED}" >> "$GITHUB_OUTPUT"
          echo "latest=${LATEST}" >> "$GITHUB_OUTPUT"
          if [[ "${PINNED}" == "${LATEST}" ]]; then
            echo "update_available=false" >> "$GITHUB_OUTPUT"
            echo "Base image up to date: ${PINNED}"
          else
            echo "update_available=true" >> "$GITHUB_OUTPUT"
            echo "Update: ${LATEST} (pinned: ${PINNED})"
          fi

      - name: Read current NordVPN version
        if: steps.check.outputs.update_available == 'true'
        id: nordvpn_version
        run: |
          CURRENT=$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")
          echo "current=${CURRENT}" >> "$GITHUB_OUTPUT"

      - name: Calculate suggested IMAGE_VERSION (patch +1)
        if: steps.check.outputs.update_available == 'true'
        id: image_version
        run: |
          CURRENT=$(grep "ARG IMAGE_VERSION" Dockerfile | sed "s/ARG IMAGE_VERSION='//;s/'$//")
          IFS='.' read -r major minor patch <<< "${CURRENT}"
          SUGGESTED="${major}.${minor}.$((patch + 1))"
          echo "current=${CURRENT}"     >> "$GITHUB_OUTPUT"
          echo "suggested=${SUGGESTED}" >> "$GITHUB_OUTPUT"

  publish-dev:
    needs: check-base
    if: needs.check-base.outputs.update_available == 'true'
    uses: ./.github/workflows/publish-dev.yml
    with:
      nordvpn_version: ${{ needs.check-base.outputs.current_nordvpn_version }}
      image_version: ${{ needs.check-base.outputs.suggested_image_version }}-dev
    secrets: inherit

  create-pr:
    needs: [check-base, publish-dev]
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Apply bump (version increment)
        run: |
          bash scripts/bump.sh \
            "${{ needs.check-base.outputs.current_nordvpn_version }}" \
            "${{ needs.check-base.outputs.suggested_image_version }}"

      - name: Update base image digest in Dockerfile
        run: |
          LATEST="${{ needs.check-base.outputs.latest_digest }}"
          sed -i "s|@sha256:[a-f0-9]*|@${LATEST}|" Dockerfile

      - name: Open draft PR
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          branch: auto/base-image-${{ needs.check-base.outputs.suggested_image_version }}
          commit-message: >
            chore: bump base image digest + IMAGE_VERSION
            ${{ needs.check-base.outputs.current_image_version }}
            → ${{ needs.check-base.outputs.suggested_image_version }}
          title: >
            chore: refresh base image
            (noble digest → ${{ needs.check-base.outputs.suggested_image_version }})
          body: |
            A new digest is available for `ghcr.io/linuxserver/baseimage-ubuntu:noble`.

            | | Value |
            |---|---|
            | **Pinned digest** | `${{ needs.check-base.outputs.pinned_digest }}` |
            | **Latest digest** | `${{ needs.check-base.outputs.latest_digest }}` |
            | **NordVPN version** | `${{ needs.check-base.outputs.current_nordvpn_version }}` (unchanged) |
            | **IMAGE_VERSION** | `${{ needs.check-base.outputs.current_image_version }}` → `${{ needs.check-base.outputs.suggested_image_version }}` |

            A development build has been successfully built and published to Docker Hub:
            - **Dev image**: `fredplex/nordvpn:dev-${{ needs.check-base.outputs.current_nordvpn_version }}`
            - **Moving dev tag**: `fredplex/nordvpn:dev`

            ## Before merging
            1. Review [linuxserver.io release notes](https://github.com/linuxserver/docker-baseimage-ubuntu/releases)
               for breaking changes (s6-overlay API changes, dropped packages, etc.)
            2. Pull the dev image and test on Unraid:
               ```bash
               docker pull fredplex/nordvpn:dev-${{ needs.check-base.outputs.current_nordvpn_version }}
               ```
            3. Locally: `git pull && task docker-build && task verify`
            4. `task verify-live TOKEN_FILE=<path>` — mandatory pre-release egress check

            ## After merging
            Merging triggers the production release pipeline automatically:
            - Production image built and verified
            - Pushed as `fredplex/nordvpn:latest` and
              `fredplex/nordvpn:${{ needs.check-base.outputs.suggested_image_version }}`
            - GitHub Release created → notification email sent to repo watchers

            > **Draft PR** — do not merge until you have tested the dev image and
            > run `task verify-live`.
          draft: true
```

---

### Phase C — `task check-base` Taskfile entry

**Scope**: One new task entry in `Taskfile.yml`.  
**Approved**: Yes (D4).  
**Risk**: Zero — wraps the read-only script.

```yaml
  check-base:
    desc: Check if a newer base image digest is available for ghcr.io/linuxserver/baseimage-ubuntu:noble
    cmds:
      - bash scripts/check-base-image.sh
```

---

### Phase D — Documentation updates

Once Phases A–C are merged, update:

| File | Change |
|---|---|
| `.ai/current.md` | Record base-refresh cadence as active; note new workflow and script |
| `.ai/tasks/active.md` | Close "Base-refresh cadence" deferred item; add "Watch for base image draft PRs" to maintenance watching list |
| `AGENTS.md` Known Issues | Remove "Base-refresh cadence — not scheduled; deferred" note |
| `docs/build-and-publish.md` | Add base image refresh section mirroring NordVPN version bump section |

---

## What This Plan Does NOT Change

- The human-in-the-loop gate: every base bump is a **draft PR** the owner reviews, tests, and merges manually.
- The `verify-live` requirement before any release: the owner still runs `task verify-live` before merging the draft PR.
- The `# syntax` directive prohibition in the Dockerfile.
- The digest pin itself: the pin stays; this plan automates detecting when the pin is stale, not removing it.

---

## Files to Create / Modify

| File | Action | Phase |
|---|---|---|
| `scripts/check-base-image.sh` | Create | A |
| `.github/workflows/check-base-image.yml` | Create | B |
| `Taskfile.yml` | Add `check-base` task | C |
| `.ai/current.md` | Update handoff state | D |
| `.ai/tasks/active.md` | Close deferred item | D |
| `AGENTS.md` | Remove Known Issues entry | D |
| `docs/build-and-publish.md` | Add base refresh section | D |

---

## Success Criteria

- `scripts/check-base-image.sh` correctly reports digest status (stale vs. current) when run locally.
- `.github/workflows/check-base-image.yml` fires monthly; opens a draft PR with digest change + IMAGE_VERSION bump + pre-built dev image when a new digest is detected; exits cleanly when up to date.
- Next time linuxserver.io updates `baseimage-ubuntu:noble`, a draft PR appears within the monthly window without any manual action from the owner.
- Merging the draft PR triggers a full production release (`:latest` + `:<IMAGE_VERSION>` pushed, GitHub Release created, notification sent).
