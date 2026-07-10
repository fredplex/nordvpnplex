# Version Logs Missing on Unraid — Root Cause, Recommendations, Plan

Created: 2026-07-10 | Status: In progress (approved 2026-07-10 — Autonomous mode, all phases)

## Background — why this is needed

Owner reports the Container Startup Version Logs feature (PR #12, merged 2026-07-09) works
in local builds but does **not** appear on the Unraid server, even though the running
image's digest matches `fredplex/nordvpn:latest` on Docker Hub. The Unraid startup log
shows both pre-feature symptoms:

- `NordVPN Docker Client v.` — empty version (the pre-`with-contenv` shebang bug that
  Phase A of PR #12 fixed)
- No `nordvpnplex version:` / `base image digest:` lines in the LSIO branding block
  (the `/build_version` file that Phase B of PR #12 added does not exist in the image)

This document is the debug findings and remediation plan. No code is changed by this
document; each phase becomes a commit only after owner approval.

---

## Findings

### Root cause — the feature was never published. Docker Hub `latest` predates PR #12.

There is nothing wrong with the feature or with the Unraid host. The image on Docker Hub
simply does not contain the feature yet.

**Timeline (all evidence from `git log`, `gh run list`, `gh run view`, `gh release list`):**

| When (UTC) | Event |
|------------|-------|
| 2026-07-08 11:07 | PR #9 (`auto/base-image-5.5.4`) merged — base digest refresh, `IMAGE_VERSION` 5.5.3 → 5.5.4 (`5e521f3`) |
| 2026-07-08 11:09 | `publish.yml` run 28937976663 detected the version bump, built, verified, and pushed `fredplex/nordvpn:latest` + `:5.5.4`; GitHub Release `5.5.4` created. **This is the current Docker Hub `latest` — built one day before the feature existed.** |
| 2026-07-09 14:30 | PR #12 (`feature/container-startup-version-logs`) merged (`c3278f6`) — contains the `00-version` shebang fix (`1aca39d`) and the `/build_version` generation (`e919b52`), but **no `ARG IMAGE_VERSION` bump** |
| 2026-07-09 14:31 | `publish.yml` run 29025689584 triggered (the PR touched `Dockerfile`), but its release gate logged: **"No version bump detected in Dockerfile. Bypassing production release."** → `release_needed=false`, nothing pushed |

The release gate at `.github/workflows/publish.yml` (step "Resolve release versions")
only publishes on a push to `main` when the merge diff contains
`^\+ARG (NORDVPN|IMAGE)_VERSION=`. PR #12's Dockerfile diff added `ARG BASE_DIGEST`
(redeclare) and the `/build_version` RUN — neither matches, so the gate correctly (per its
design) skipped the release.

**Why the owner's digest check was misleading:** the Unraid image digest matching Docker
Hub `latest` only proves the server is running the current `latest` — it says nothing
about whether `latest` contains the feature. It doesn't: `latest` == the 5.5.4 build from
PR #9, published 2026-07-08.

**Why local builds work:** `task docker-build` compiles from the working tree (post-PR #12
source), so every local image has the feature.

### Finding 2 — Process gap (medium): runtime changes without a version bump silently never ship

This is the systemic issue behind the root cause. The pipeline's contract is
"releases happen on version bumps," but nothing enforces the inverse:
**a runtime-affecting change (Dockerfile, `rootfs/**`) merged without an `IMAGE_VERSION`
bump is silently stranded on `main`** until the next unrelated bump (next NordVPN release
or monthly base refresh) happens to carry it out. No warning is emitted anywhere — the
publish run even reports `success`.

Two sub-gaps:

- `build-validate.yml` (PR gate) validates that the image *builds*, but not that
  runtime-affecting PRs bump `IMAGE_VERSION`.
- `publish.yml` triggers on pushes to `main` only with `paths: Dockerfile` — a
  `rootfs/`-only merge wouldn't even trigger the workflow, let alone the gate.

### Finding 3 — Minor: `bump.sh` changelog wording assumes only two bump reasons

`scripts/bump.sh` auto-writes the README Changelog entry as either
"NordVPN X → Y" or "Base image refresh — …" (chosen solely by whether `NORDVPN_VERSION`
changed). A feature-driven, image-only bump — exactly what Phase A below needs — would be
mislabeled **"Base image refresh"**. The wording needs a manual edit after running the
script (or a third message path).

Also stale: the header comment in `bump.sh` still says "The pinned version lives in
CLAUDE.md (updated below)" — Phase G of the pipeline review (`180561f`) made `Dockerfile`
the single source of truth, and the script no longer touches `CLAUDE.md`.

### Side observation (doc drift, not blocking)

`CLAUDE.md`'s base-image constraint still cites digest `@sha256:53411508…`; the Dockerfile
pin has since been refreshed to `@sha256:99ecdba8…` (PR #9). The constraint's *intent*
(never change the digest without instruction) is unaffected, but the cited digest is stale.

---

## Recommendations

1. **Ship the feature now** with a normal image-only version bump (5.5.4 → 5.5.5) through
   the existing pipeline. No workflow changes needed to unblock the owner — the gate works
   as designed once a bump is present.
2. **Enforce the contract at PR time**: extend `build-validate.yml` to fail any PR that
   changes `Dockerfile` or `rootfs/**` without also bumping `ARG IMAGE_VERSION`.
   Recommended as a hard fail (any such change alters shipped image bytes); a warn-only
   variant is the fallback if the owner prefers flexibility.
3. **Fix the small tooling/doc debt** uncovered along the way (Findings 3 + side
   observation + document the rule in `docs/build-and-publish.md` §9 "Versioning design
   and release flow").

---

## Phases

### Phase A — Ship the stranded feature (image-only bump 5.5.4 → 5.5.5)

- Run `bash scripts/bump.sh 5.2.0 5.5.5` (NordVPN pinned version unchanged).
- Hand-edit the auto-appended README Changelog line: replace the incorrect
  "Base image refresh" summary with e.g.
  "Image 5.5.4 → 5.5.5 — ship container startup version logs (NordVPN unchanged at 5.2.0)".
- Commit on this branch; PR to `main`; owner merges.
- `publish.yml` detects `+ARG IMAGE_VERSION='5.5.5'`, builds, runs `verify.sh`, pushes
  `:latest` + `:5.5.5`, creates GitHub Release 5.5.5.
- **Owner action on Unraid**: pull the new `latest` **and recreate the container**
  (a pull alone does not restart an existing container onto the new image), then confirm
  the startup log shows `NordVPN Docker Client v.5.5.5` and the
  `nordvpnplex version:` / `base image digest:` lines in the branding block.

### Phase B — PR guard: runtime changes must bump IMAGE_VERSION

- Add a step to `.github/workflows/build-validate.yml` (before the build): diff the PR
  against its base; if `Dockerfile` or `rootfs/**` changed and the diff does not contain
  `^\+ARG IMAGE_VERSION=`, fail with an explanatory message
  ("runtime-affecting change without an image version bump will never be published —
  run scripts/bump.sh").
- Version-bump-only and docs-only PRs are unaffected; auto bump PRs
  (`auto/nordvpn-*`, `auto/base-image-*`) already bump and pass.
- Validation: reason through the four PR shapes (docs-only, bump-only, runtime+bump,
  runtime-no-bump); optionally exercise with a scratch PR.

### Phase C — Tooling/doc cleanup (small, optional but recommended)

- `scripts/bump.sh`: add a third changelog wording for image-only bumps where the base
  digest did not change (feature/fix release), and fix the stale "CLAUDE.md (updated
  below)" header comment.
- `docs/build-and-publish.md` §9: document the rule — *every change that alters the
  shipped image (Dockerfile, rootfs) must ship with an `IMAGE_VERSION` bump; the PR
  validation gate enforces this* — and note the publish gate's bypass behavior in §4.3.
- `CLAUDE.md`: refresh the stale digest reference in the base-image constraint
  (text-only; the Dockerfile pin itself is untouched).

---

## Decisions (resolved by owner, 2026-07-10)

1. **Phase A approved** — bump to 5.5.5 and ship.
2. **Phase B guard: hard fail.**
3. **Phase C included** on this branch.

## Execution Order

| Step | Description | Commit prefix | Status |
|------|-------------|---------------|--------|
| 1 | Phase A — image-only bump 5.5.4 → 5.5.5 (ship the stranded feature) | `chore(release):` | Done |
| 2 | Phase B — PR guard: runtime changes must bump IMAGE_VERSION (hard fail) | `feat(ci):` | Pending |
| 3 | Phase C — bump.sh changelog wording + stale version-doc cleanup | `chore(tooling):` | Pending |

---

## Verification Plan

### Automated
- `task docker-build` after Phase A bump (image builds with 5.5.5).
- `task verify` runtime gate locally.
- Phase B: PR-shape reasoning + optional scratch-PR exercise of the new gate.

### Manual
- After the Phase A release lands: on Unraid, pull + recreate the container and confirm
  both version banners in the startup log (the original bug report's reproduction, now as
  the acceptance check).
