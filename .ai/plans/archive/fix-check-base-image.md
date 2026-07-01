# Plan: Fix check-base-image Workflow — Verify Failure + Documentation Gaps

**Date**: 2026-07-01
**Branch**: `fix/check-base-image-verify`
**Status**: Complete

---

## Background

The monthly `check-base-image.yml` workflow ran on July 1, 2026 and failed with:

```
ERROR: Image fredplex/nordvpn:dev not found. Run: task docker-build
```

The workflow's first job (`check-base`) succeeded — it correctly detected a new base image digest is available. The second job (`publish-dev`, via the reusable `publish-dev.yml` workflow) succeeded at build+push (all 4 dev tags pushed to Docker Hub), but the final **verify step** failed. This plan addresses both the **root cause fix** and **documentation gaps** that made the workflow's purpose unclear.

---

## Findings

### Finding 1 — Root cause: `publish-dev.yml` verify step cannot find the image (bug)

The `publish-dev.yml` workflow uses `docker/build-push-action@v6` with `push: true` (line 81 of publish-dev.yml). This pushes the image to Docker Hub but does **not** load it into the runner's local Docker daemon. The subsequent verify step (line 93) calls:

```yaml
bash scripts/verify.sh "fredplex/nordvpn:dev" ...
```

`verify.sh` line 35 does `docker image inspect "${IMAGE_REF}"` — this checks the **local** Docker daemon, not Docker Hub. Since the image was never loaded locally, it always fails.

Compare with `publish.yml` (the production workflow), which avoids this bug:
- Line 97: `load: true` — loads the image into the local daemon
- Line 101: tags it as `temp-release`
- Line 106: verifies against the local `temp-release` tag
- Line 108–120: then does a separate `push: true` step to push to Docker Hub

**The dev workflow does a combined build+push in one step, then tries to verify against Docker Hub, but the verify script only checks the local daemon.** This is not a race condition with Docker Hub propagation — it's an architectural mismatch between the build step (push-only, no local load) and the verify step (local daemon only, no pull).

### Finding 2 — Documentation: no "why does the base image change?" explanation

Nowhere in the docs is there a clear explanation of:

- **What the base image is**: `ghcr.io/linuxserver/baseimage-ubuntu:noble` is linuxserver.io's Ubuntu Noble Docker base, which bundles s6-overlay (the process supervisor that runs init scripts and services inside the container).
- **Why linuxserver.io rebuilds it**: They periodically release updated versions that include OS security patches (Ubuntu package updates), s6-overlay updates, and linuxserver-specific hardening/fixes.
- **Why we pin the digest**: Without the digest pin, a future rebuild of the base image tag by linuxserver.io would silently change what our Dockerfile builds from. The pin makes our builds deterministic. But it also means we lose security patches automatically — hence the monthly check to intentionally pick up those updates.
- **Why we need a monthly check**: The `apt-get upgrade -y` in the Dockerfile patches packages installed **into** the image at build time, but cannot update packages baked into the base image layers (s6-overlay binaries, base OS libraries that were installed when linuxserver.io built their own image). These only change when the base image digest changes.

The best existing explanation is in `.ai/plans/base-image-refresh.md` (lines 17–31), but that's a historical plan document, not part of the developer-facing docs in `docs/`.

### Finding 3 — `publish-dev.yml` verify also doesn't pull from Docker Hub

Even if `load: true` is not used, a valid alternative would be to `docker pull` the image from Docker Hub before verifying. But `verify.sh` has no `docker pull` step — it assumes the image is already present locally (valid for the local `task docker-build` use case, but not for CI).

### Finding 4 — Documentation site map does not mention the base image check workflow

The `docs/README.md` index and `docs/build-and-publish.md` table of contents both mention the workflow, but the significance of the workflow (it's a security patch mechanism, not just "check if something changed") is underplayed. The `docs/user-guide.md` section on "Rebuilding / Refreshing the Base Image" (lines 434–451) is the closest to explaining "why" but is in a troubleshooting/recovery section, not a first-class explanation.

---

## Proposed Changes

### Phase A — Fix the `publish-dev.yml` verify bug (root cause)

**File**: `.github/workflows/publish-dev.yml`

Two approaches — recommend **Approach 1** for consistency with `publish.yml`:

**Approach 1 (recommended) — Two-step build: load locally for verify, then push**

```yaml
- name: Build dev image locally (for smoke tests)
  id: build-verify
  uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64
    load: true
    build-args: |
      NORDVPN_VERSION=${{ steps.version.outputs.version }}
      IMAGE_VERSION=${{ steps.version.outputs.image_version }}
    tags: fredplex/nordvpn:temp-dev

- name: Run unified smoke tests (verify.sh)
  run: |
    bash scripts/verify.sh "fredplex/nordvpn:temp-dev" "${{ steps.version.outputs.version }}" "${{ steps.version.outputs.image_version }}"

- name: Build and push dev image
  uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64
    push: true
    build-args: |
      NORDVPN_VERSION=${{ steps.version.outputs.version }}
      IMAGE_VERSION=${{ steps.version.outputs.image_version }}
    tags: |
      fredplex/nordvpn:dev
      fredplex/nordvpn:dev-${{ github.sha }}
      fredplex/nordvpn:dev-${{ steps.version.outputs.version }}
      fredplex/nordvpn:${{ steps.version.outputs.image_version }}
```

**Approach 2 — Single build, push, pull back, then verify**

Keep the single `push: true` step but add `docker pull` with retries before `verify.sh`:

```yaml
- name: Pull dev image back from Docker Hub (with retries)
  run: |
    for i in $(seq 1 5); do
      if docker pull fredplex/nordvpn:dev; then
        echo "Pull succeeded on attempt $i"
        break
      fi
      echo "Pull attempt $i failed, retrying in 10s..."
      sleep 10
    done
```

**Recommendation**: Approach 1. It avoids Docker Hub propagation issues entirely, is consistent with `publish.yml`'s verify pattern, and costs one extra build (but the first build is cached/rebuilt quickly since BuildKit layer cache is global). Approach 2 introduces a dependency on Docker Hub being reachable and the tag being propagated.

### Phase B — Add base image explanation to `docs/architecture.md`

**File**: `docs/architecture.md`

Add a new subsection under "Key Architectural Decisions" after "Base image digest pin" (around line 157) explaining:

- What linuxserver.io's `baseimage-ubuntu:noble` provides (Ubuntu Noble + s6-overlay)
- Why linuxserver.io periodically rebuilds it (security patches, s6 updates, hardening)
- The security patch gap: `apt-get upgrade` patches installed packages but not base layer binaries
- How the monthly check bridges this gap while preserving deterministic builds

### Phase C — Expand `docs/build-and-publish.md` §4.5

**File**: `docs/build-and-publish.md` (section 4.5, around line 335)

Current content describes *what* the workflow does mechanically. Add *why*:
- Add a "Why this exists" paragraph before the "What it does" list
- Explain the relationship between the digest pin, `apt-get upgrade`, and the security patch gap
- Link to the new architecture.md section for the full explanation

### Phase D — Keep `docs/user-guide.md` "Rebuilding / Refreshing" section as-is

The existing `docs/user-guide.md` §5 "Rebuilding / Refreshing the Base Image" (lines 434–451) is actually the best existing user-facing explanation. It's just not linked or referenced from the other docs. Add a cross-reference from the new architecture.md and build-and-publish.md sections.

---

## Scope Boundaries

### In scope
- Fix `publish-dev.yml` verify step (Phase A)
- Add explanatory docs to architecture.md and build-and-publish.md (Phases B–C)
- Cross-reference existing user-guide.md section (Phase D)

### Out of scope
- Modifications to `verify.sh` (the script is correct — designed for local images; CI should use `load: true` pattern)
- Modifications to `publish.yml` (it already handles this correctly)
- Modifications to `check-base-image.yml` (the verify is in `publish-dev.yml`, which it calls)
- Modifying any AGENTS.md, CLAUDE.md, or .ai/ files (plan review only; those get updated at session close per standard process)

---

## Validation

After implementing:

```bash
task docker-build        # Verify local build still works
task verify              # Local verify unaffected
# CI validation: push branch, open PR, watch build-validate.yml pass
# Manual test: trigger publish-dev from Actions UI to confirm verify now passes
```

No changes to `Dockerfile`, `rootfs/`, or runtime behavior — workspace and workflow change only.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Two-step build is slower in CI | Cached layers; second build is mostly no-op. publish.yml already does this. |
| `load: true` fails on non-linux/amd64 platforms | dev workflow is pinned to `linux/amd64` only. |
| Docs drift from reality again | New docs explain why the check exists, not implementation details that rot. |

---

## Files to Change

| File | Action | Phase |
|------|--------|-------|
| `.github/workflows/publish-dev.yml` | Split build into two steps: load+verify, then push | A |
| `docs/architecture.md` | Add "Why the base image changes" subsection | B |
| `docs/build-and-publish.md` | Expand §4.5 with "why" context | C |

---

## Owner Decision Required

1. **Approach 1 (two-step build) or Approach 2 (pull+retry)?** → Recommended: Approach 1
2. **Phase B/C documentation changes — approve scope?**
3. **Proceed to implementation after plan approval?**
