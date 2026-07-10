# No Dev-Build-and-Test Cycle for Manual PRs — Findings, Recommendations, Plan

Created: 2026-07-10 | Status: Complete

## Background — why this is needed

While debugging the version-logs-release-gap issue (previous session), it became clear that
PR #12 (the original startup version-log feature) and PR #14 (its fix) both went straight
from a manually-created branch to production `:latest` with **zero dev-image testing** —
the only pre-merge gate either PR passed was `build-validate.yml`'s `docker build` compile
check. The owner asked for an in-depth review: *any* change that reaches production should
go through a dev-build-and-test cycle, and asked specifically whether `:dev` is now out of
sync with production as a result.

This document is the findings and remediation plan. No code is changed by this document;
each phase becomes a commit only after owner approval.

---

## Findings

### Finding 1 (Critical) — The dev-build-and-test cycle only exists for automated version-bump PRs, never for manually created PRs

The repo has exactly one PR shape that gets a dev image before merge: `auto/nordvpn-<ver>`
and `auto/base-image-<ver>` branches, opened by the two cron workflows
(`check-nordvpn-release.yml` daily, `check-base-image.yml` monthly). Each of those calls
`publish-dev.yml` as a reusable workflow *before* opening its draft PR, and the PR body
includes a "Before merging" checklist: pull the dev tag, test on Unraid, run
`task verify-live TOKEN_FILE=...` (the only check that validates real tunnel connectivity).

Every other PR shape — `feature/*`, `fix/*`, `chore/*`, `docs/*` — only triggers
`build-validate.yml`, whose entire job is:
```yaml
- docker build --platform linux/amd64   # compile-check only
- bash scripts/verify.sh ...             # NOTE: this line already exists — see caveat below
```

Wait — `build-validate.yml` *does* call `scripts/verify.sh` (added in the 2026-07-09 pipeline
review, Phase I). So manual PRs do get the full stateless + runtime smoke-test suite
(IMAGE_VERSION env, `nordvpn --version`, iptables kill-switch, nordvpnd socket) run against a
throwaway CI-local image. **What they do not get**: a pushed, pullable image the owner can
put on real Unraid hardware, and no `task verify-live` real-tunnel/real-egress validation —
`verify.sh`'s runtime check uses a fake token and cannot open an actual NordLynx tunnel.
This is the actual, precise gap: CI-only compile+smoke-test vs. an owner-driven dev-build/pull/
`verify-live` cycle. The two original feature PRs (#12, #14) both merged with only the former.

**Concretely, this is why the original bug happened the way it did**: PR #12 passed
`build-validate.yml` (build succeeds, stateless/runtime smoke tests pass — the container did
start and had a socket), but nobody pulled a real dev image and looked at the *startup log
banner text* — because there was never a dev image to pull, and `verify.sh` doesn't assert on
log line content, only on env vars, `nordvpn --version`, and the kill switch. The bug was
"correct enough to pass every automated check" while still being visibly broken to a human
reading the logs.

### Finding 2 (Critical, confirmed live) — `:dev` is currently stale and reproduces the exact bug the owner originally reported

Directly inspected the running `fredplex/nordvpn:dev` image on Docker Hub (pulled and ran it):

| | `:dev` (current) | `:latest` (current, = `5.5.5`) |
|---|---|---|
| `IMAGE_VERSION` | `5.5.4-dev` | `5.5.5` |
| Built | 2026-07-08T01:03:39Z | 2026-07-10T10:56Z |
| `nordvpn --version` | `5.2.0` (matches — no drift here) | `5.2.0` |
| `/build_version` (branding block feature) | **missing** | present |
| `/etc/cont-init.d/00-version` shebang | `#!/bin/bash` (**broken** — the original bug) | `#!/command/with-contenv bash` (fixed) |

**`:dev` right now has both bugs the owner originally reported on Unraid.** If the owner (or
a future contributor) pulls `:dev` today expecting a preview of upcoming changes, they would
see the exact same empty `NordVPN Docker Client v.` banner and no branding-block version
lines — the bug this whole investigation started from.

**Root cause**: `:dev` is a single moving tag that is *only* repointed as a side effect of
the two cron workflows firing (`check-nordvpn-release.yml`, `check-base-image.yml`). It has
no relationship to arbitrary merges to `main`. PR #12 and PR #14 were both manually created
branches, so neither cron workflow ran because of them, so `:dev` was never touched — it is
currently 2 production releases and 2 unreleased-at-build-time commits stale, and will
silently continue drifting further behind every time a manual PR merges, until the next
cron-triggered bump happens to catch it up.

### Finding 3 (Process/trust) — accumulated manual-PR changes silently ride along inside the next automated bump's "tested" dev image

Because a cron-triggered dev build always builds from current `main` HEAD (not from a
specific reviewed commit or diff), the *next* time `check-nordvpn-release.yml` or
`check-base-image.yml` fires, its dev image will silently include everything merged by
manual PRs since the last cron run — but its auto-generated PR checklist only says "test the
new NordVPN version" / "test the new base image," with no callout that unrelated rootfs/
Dockerfile changes are also riding along. The owner's sign-off on that dev image ("tested,
ship it") could unintentionally endorse untested manual changes bundled into the same
snapshot. This is the same root problem as Findings 1–2, just visible one step further
downstream: **there is currently no dev-build checkpoint tied to the actual diff a human is
reviewing** — only to two specific automated triggers.

### Side observation (doc drift, not blocking)

`build-validate.yml`'s own header comment (lines 3–4) still says *"Runs docker build on every
PR to main. Build only — no registry login, no push."* This was accurate when the workflow
was created, but is now stale: Phase I of the 2026-07-09 pipeline review added the
`scripts/verify.sh` smoke-test step, and the version-logs-release-gap session added the
IMAGE_VERSION-bump guard. Worth correcting in Phase 3 alongside the rest of the doc sync.

### Finding 4 (Minor, pre-existing, related but not new) — even the existing checklist is a soft gate

Per `.ai/memory/architecture-decisions.md` and `SESSION_NOTES.md` (2026-07-05 session), this
was already an explicit, deliberate decision: *"GitHub cannot block a merge on an unchecked
markdown checkbox without branch protection / required status checks, which is explicitly
out of scope for this pass."* Recording this because Phase 2 below inherits the same
limitation unless the owner wants to revisit it — flagged as an open question, not re-litigated
here.

---

## Recommendations

1. **Immediate, zero-risk fix**: manually re-trigger `publish-dev.yml` now to refresh `:dev`
   to current `main` (`5.5.5`) — stops it from actively misrepresenting reality today,
   independent of everything else in this plan.
2. **Make "any change to prod goes through a dev build and test cycle" structurally true**:
   trigger a dev-image build + push for *any* PR that changes `Dockerfile` or `rootfs/**`
   (reusing the exact diff-detection already added for the IMAGE_VERSION-bump guard in
   `build-validate.yml`), not just `auto/*` branches. Give the owner a real pullable image and
   the same "Before merging" checklist pattern already used for automated bump PRs.
3. **Keep `:dev` honest going forward**: once dev-builds are triggered by any qualifying PR,
   `:dev`/`:dev-<sha>` naturally stay close to current `main` instead of only refreshing on a
   cron cadence — closing Finding 2 and Finding 3 structurally, not just as a one-time fix.
4. **Don't touch what already works**: the automated `auto/*` bump flow, `publish.yml`'s
   production gate, and the IMAGE_VERSION-bump guard from the previous plan are all
   functioning as designed — this plan only extends the dev-build trigger surface, it does
   not change how any of those work.

---

## Phases

### Phase 0 — Refresh the stale `:dev` tag (no code change; execution deferred to end of run)

- Manually trigger `publish-dev.yml` via `gh workflow run publish-dev.yml --ref main` (blank
  inputs — uses pinned `NORDVPN_VERSION`/`IMAGE_VERSION` from `Dockerfile`, i.e. builds
  `5.5.5-dev` from current `main`).
- **Prerequisite bugfix discovered mid-run** (see commit `9768636`): the first attempt at this
  phase failed — `publish-dev.yml`'s blank-`base_digest` fallback path
  (`grep "ARG BASE_DIGEST" Dockerfile`) matched both the pinned `ARG BASE_DIGEST='...'` line
  and the bare `ARG BASE_DIGEST` redeclare line added in `9f1b365`, breaking
  `$GITHUB_OUTPUT` parsing. Fixed in the same 3 spots that shared the pattern
  (`publish-dev.yml`, `check-base-image.yml`, `scripts/check-base-image.sh`) by matching only
  `ARG BASE_DIGEST=`. This bug was dormant in production — `check-nordvpn-release.yml` and
  `check-base-image.yml` would have hit it on their next real trigger.
- **Execution deferred**: since `workflow_dispatch` runs use the workflow file from the ref
  it's pointed at, testing the fix requires it to be pushed. Owner chose to defer Phase 0's
  live re-run until this branch is pushed and merged at the end of this session, rather than
  push mid-run.
- Validation (once executed): re-run the same inspection as Finding 2 against the refreshed
  `:dev` — confirm `IMAGE_VERSION=5.5.5-dev` (or newer, if Phases 1–3 have already shipped by
  then), `/build_version` present, `00-version` shebang fixed.

### Phase 1 — Auto-trigger a pushable dev build for any PR that changes `Dockerfile` or `rootfs/**`

- **File**: `.github/workflows/build-validate.yml`
- **Change**: add a job that runs after the existing build/smoke-test job succeeds, gated on
  (a) the same runtime-change diff-detection already added for the IMAGE_VERSION-bump guard,
  and (b) the PR being from the same repo, not a fork (`github.event.pull_request.head.repo.full_name == github.repository`)
  — `pull_request` doesn't leak secrets to fork PRs anyway, but an explicit skip avoids a
  confusing failed-login run if a fork PR is ever opened.
- Calls `publish-dev.yml` (`workflow_call`, already supports this — no new workflow file
  needed) with `image_version: <pinned>-dev-pr<N>` (or similar PR-scoped identifier) so
  concurrent PRs' dev builds don't clobber each other's *distinguishing* tag, while still
  updating the shared moving `:dev` / `:dev-<sha>` tags so `:dev` always reflects the most
  recently tested candidate — see Open Question 1 for the exact tag-naming call.
- **Validation**: reason through the four PR shapes from the previous plan (docs-only,
  bump-only, runtime+bump, runtime-no-bump) plus this phase's new axis (fork vs. same-repo);
  exercise with a scratch PR if practical.

### Phase 2 — Post the "Before merging" checklist on manual PRs, matching the automated-bump pattern

**Delivered as part of Phase 1's commit (`c49ee8b`), not a separate commit**: the `comment`
job (posting the checklist) and the header-comment fix were written together with the
`dev-build` job since all three are one coherent edit to the same file/section — splitting
them into an artificial second commit would have added no isolation value. No scope was cut;
everything below was implemented.

- **File**: `.github/workflows/build-validate.yml` (or a small follow-up step in the same job)
- **Change**: once Phase 1's dev image is pushed, post/update a PR comment with the same
  checklist shape already used in `check-base-image.yml`'s and `check-nordvpn-release.yml`'s
  draft-PR bodies: pull the dev tag, test on Unraid, run
  `task verify-live TOKEN_FILE=<path>` before merging.
- Also correct `build-validate.yml`'s stale header comment (see side observation above) while
  the file is open for this phase.
- **Validation**: confirm the comment renders correctly and includes the right tag name for a
  scratch PR.

### Phase 3 — Documentation sync

- `docs/build-and-publish.md`: extend §1 Architecture overview + "Human gates" table to cover
  the manual-PR dev-cycle path (today it only documents the NordVPN-check/base-check paths);
  extend §3.5 "Dev workflow" with the new PR-triggered path; update §4.2 "PR build validation"
  to describe the dev-build/push/checklist steps added in Phases 1–2.
- `docs/testing.md`: extend the "Build Validation (CI)" section (already updated once in the
  previous plan for the version-bump guard) with the new dev-build step.
- `.ai/memory/architecture-decisions.md`: new decision entry recording this fix and Finding 2's
  root cause (dev tag only refreshed by cron triggers → drifts stale on manual merges).
- `docs/feature-state.md`: add a row for the PR-triggered dev-build capability.

---

## Decisions (resolved by owner, 2026-07-10)

1. **Tag semantics — yes**: the shared moving `:dev` tag is updated by *any* qualifying PR
   (auto/* bumps **and** manual feature/fix PRs), plus a per-PR tag (e.g. `:dev-pr<N>`) so a
   specific PR under review isn't silently overwritten by another PR's concurrent CI run.
2. **Merge gate strength — agreed with recommendation**: keep the "Before merging" checklist
   as an unenforced markdown checkbox; branch protection / required status checks stay out of
   scope for this plan (consistent with the 2026-07-05 decision — Finding 4).
3. **Trigger scope — agreed with recommendation**: Phase 1 only fires for PRs that change
   `Dockerfile`/`rootfs/**` (reusing the existing diff-detection), not every PR.
4. **Phase 0 timing — do it now**: the one-off `:dev` refresh runs immediately as part of this
   execution, independent of Phases 1–3.

## Execution Order

| Step | Description | Commit prefix | Status |
|------|-------------|---------------|--------|
| 1 | Phase 0 — refresh stale `:dev` tag (workflow run, no code commit); prerequisite `ARG BASE_DIGEST` grep bugfix | `fix(ci):` (bugfix); workflow run deferred to end | Done — bugfix `9768636`; `:dev` refreshed post-merge (run `29090534139`), verified `IMAGE_VERSION=5.5.5-dev`, `/build_version` present, `00-version` shebang fixed |
| 2 | Phase 1 — auto-trigger pushable dev build for Dockerfile/rootfs PRs | `feat(ci):` | Done |
| 3 | Phase 2 — post "Before merging" checklist on manual PRs + fix stale header comment | `feat(ci):` | Done (delivered inside Phase 1's commit `c49ee8b` — see note below) |
| 4 | Phase 3 — documentation sync | `docs:` | Done |

---

## Verification Plan

### Automated
- Phase 1: reason through PR shapes (docs-only / bump-only / runtime+bump / runtime-no-bump ×
  fork / same-repo); optionally exercise with a scratch PR.
- Phase 2: confirm PR comment renders with correct tag references on a scratch PR.
- `task docker-build` / `task verify` after any Taskfile or script changes, if applicable.

### Manual
- Phase 0: re-inspect `:dev` post-refresh exactly as done for Finding 2 — confirm it now
  matches `main` HEAD content.
- Phase 1: open a real scratch PR touching `rootfs/`, confirm a dev image gets pushed and is
  pullable.
- After the full plan lands: the *next* manually created feature/fix PR should get a real dev
  image + checklist before merge — this is the actual acceptance test, since it's the exact
  scenario that caused the original bug.
