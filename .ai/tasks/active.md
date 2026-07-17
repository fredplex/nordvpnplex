<!-- prime: version=3.0.0 template=.ai/tasks/active.md date=2026-07-17 -->
# Active Tasks

Current work in progress.

---

## Current Status

**None active — awaiting direction.** AI Docs Re-prime + Backup Merge complete. Dockerfile Follow-up Review plan (`.ai/plans/dockerfile-followup-review.md`) has three still-open findings; Tier 2 items need owner input before implementation. Watching for NordVPN releases and base image digest updates (both automated via GHA cron).

### AI Docs Re-prime + Backup Merge (Complete)

Re-primed the `.ai/`/`docs/` agent workspace to vibe-coding-template v3.7.9. The re-prime
run regenerated all 29 non-stub files from raw templates (manifest showed `fromVersion:
"0.0.0"` for every file, not a genuine 0.0.0→N upgrade), wiping real project-specific content
back to generic scaffold placeholders — including deleting `CLAUDE.md`'s entire Constraints
section outright. Merged the real content back in from the pre-update backup per
`.ai/GUIDE.md` Part 3.

- [x] Onboarding pass identified the mid-re-prime state and the content loss (—)
- [x] Merged backup content into `AGENTS.md`, `CLAUDE.md`, `docs/*`, `.ai/memory/*`,
      `.ai/rules/*`, `.ai/current.md`, `.ai/tasks/*`, `.ai/SESSION_NOTES.md`, `.ai/README.md` (`0543cd7`)
- [x] Session close (this commit)

All phases complete. No formal plan file was used for this task — it followed
`.ai/GUIDE.md`'s prescribed re-prime steps directly.

### Concurrency Deadlock Fix (Complete)

Fixed the GitHub Actions concurrency-group deadlock between `check-base-image.yml` (caller) and `publish-dev.yml` (reusable callee) — `github.workflow` evaluates to the caller's name inside a called workflow, so both landed in the same group `Check Base Image-refs/heads/main`. `check-nordvpn-release.yml` had the same latent bug. All three workflows moved to unique group keys with guard comments.

- [x] Phase 0 — Revise plan with review recs (`566074a`)
- [x] Phase 1 — Normalize concurrency groups in all three workflows + guard comments (`ee11afb`)
- [x] Phase 2 — Session close + archive plan (this commit)

All phases complete. See `.ai/plans/archive/concurrency-deadlock-fix.md` for full detail.

### AGENTS.md Scaffold Fill (Complete)

Replaced all five `<placeholder>` template stubs in `AGENTS.md` with project-specific
content: tech stack, current posture, Architecture section (release data flow + startup
sequence + key rules), Key Boundaries (approved/not-approved + must/must-not), and File
Structure table.

- [x] Fill stubs sourced from `docs/architecture.md`, `docs/project-rules.md`, `.ai/memory/project-state.md` (this commit)


### Dev Build Gate for Manual PRs (Complete)

Manually created `feature/*`/`fix/*` PRs that change `Dockerfile`/`rootfs/**` now get the
same dev-build-and-test cycle `auto/*` bump PRs already had — a real pushed dev image
(`:<version>-dev-pr<N>`, refreshing shared `:dev`) plus a "Before merging" checklist.
Triggered by discovering `:dev` had gone stale and was reproducing the exact bug from the
Version Logs Release Gap task below (missing `/build_version`, broken `00-version` shebang).

- [x] Phase 0 — refresh stale `:dev` tag + fix dormant `ARG BASE_DIGEST` grep bug (`9768636`; live refresh post-merge, run `29090534139`)
- [x] Phase 1+2 — `dev-build`/`comment` jobs in `build-validate.yml` (`c49ee8b`)
- [x] Phase 3 — documentation sync (`693b7ad`)

All phases complete. See `.ai/plans/archive/dev-build-gate-for-manual-prs.md` for full detail.

### Version Logs Release Gap (Complete)

Debugged missing startup version logs on Unraid: Docker Hub `latest` (5.5.4, published
2026-07-08 from PR #9) predated the feature (PR #12, merged 2026-07-09 without an
`IMAGE_VERSION` bump — publish gate correctly bypassed).

- [x] Phase A — image-only bump 5.5.4 → 5.5.5 (ship the stranded feature) (`9b60b5f`)
- [x] Phase B — PR guard: runtime changes must bump IMAGE_VERSION (hard fail) (`fbdacc1`)
- [x] Phase C — bump.sh changelog wording + stale version-doc cleanup (`faf5e8e`)

All 3 phases complete. See `.ai/plans/archive/version-logs-release-gap.md` for full detail.

### Container Startup Version Logs (Complete)

- [x] Phase A — Fix Custom Log Version (`1aca39d`)
- [x] Phase B — Print Base Image Version in Branding Block (`e919b52`)

All 2 phases complete. See `.ai/plans/archive/container-startup-version-logs.md` for full detail.

### Build & Release Pipeline Review & Optimization (Complete)

- [x] Phase A — Fix `task bump` doc-drift and stale examples (`4620248`)
- [x] Phase B — Parameterize and fix base-image dev-build workflow (`9f1b365`)
- [x] Phase C — Remove TODO placeholders from `bump.sh` Changelog appends (`4d66654`)
- [x] Phase D — Consolidate redundant documentation (`57e724c`)
- [x] Phase E — Optimize publish workflows to build once and push (`2f27a78`)
- [x] Phase F — Deprecate/gate direct-publish tasks in Taskfile (`c6ce3dd`)
- [x] Phase G — Consolidate version source-of-truth (`180561f`)
- [x] Phase H — Minor automated release checks and concurrency cleanup (`956bac2`)
- [x] Phase I — Configured PR validation smoke-testing (`0092d81`)
- [x] Phase J — Document version design and release flow (`89cd08b`)
- [x] Phase K — Session handoff (`fddec8e`)

All 11 phases complete. See `.ai/plans/archive/build-release-pipeline-review.md` for full detail.

### Build & release workflow hardening (Complete)

- [x] Phase A — Fix `CLAUDE.md` conflict markers + add guard to `bump.sh` (`91363e0`)
- [x] Phase B — Fix stale header comment in `check-nordvpn-release.yml` (`eb1f84f`)
- [x] Phase C — Correct cadence/smoke-test-count in `docs/build-and-publish.md` (`9e77dd4`)
- [x] Phase D — Add Check Base Image workflow docs to `docs/user-guide.md` (`bf67f7c`)
- [x] Phase E — Auto-append Changelog entries in `bump.sh` + backfill `README.md` (`49b9f8d`)
- [x] Phase F — Add `verify-live` checklist item to draft PR bodies (`19ec758`)
- [x] Phase G — Guard against concurrent bump-PR races (`0afa08b`)

All 7 phases complete. See `.ai/plans/archive/build-release-workflow-hardening.md` for full detail.

**Watching**: next NordVPN release — the daily checker auto-builds/tests a dev image and opens a draft PR.

---

## Blocked Candidates

*None.*

## Future Work (deferred, not scheduled)

### Reconsider `apt-get upgrade`

**Goal**: Evaluate whether to remove `apt-get upgrade` from the Dockerfile.
**Why deferred**: Revisit after the first few monthly base image refreshes have successfully completed and validated.

---

## Ready Follow-Ups

### Watch for NordVPN Next release

**Status**: Waiting (no action needed — daily GitHub Action handles detection)
**Goal**: Bump to the next NordVPN version when available

**When triggered**:
- GitHub Actions opens a draft PR automatically, OR
- Run `task check-version` to check manually

**Checklist**:
- [ ] Draft PR reviewed: confirm NORDVPN_VERSION and IMAGE_VERSION
- [ ] PR merged (triggers GHA to build/verify/publish/tag)
- [ ] `git pull` locally (pulls the GHA-created tag)
- [ ] `task` output matches new version and shows tag on HEAD
- [ ] `.ai/current.md` updated with new versions and date

### README.md rewrite (Tier 3 — deferred, not yet approved)

**Status**: Deferred
**Goal**: Replace the upstream `bubuntux/nordvpn` mirror with a project-specific README
**Note**: `docs/user-guide.md` content feeds this when approved

---

## Recently Completed

- **AI Docs Re-prime + Backup Merge** (2026-07-17) — re-primed the `.ai/`/`docs/` workspace to vibe-coding-template v3.7.9 and merged real project-specific content back in from the pre-update backup after the re-prime run had overwritten it with generic scaffold placeholders (`0543cd7`)
- **Concurrency Deadlock Fix** (2026-07-15) — fixed the GHA concurrency-group deadlock between `check-base-image.yml`/`check-nordvpn-release.yml` (callers) and `publish-dev.yml` (reusable callee) by moving all three to unique workflow-specific group keys; `github.workflow` evaluated to the caller's name inside the called workflow, causing both to share the group `Check Base Image-refs/heads/main` (`566074a`–`ee11afb`)
- **AGENTS.md scaffold fill** (2026-07-12) — replaced all five `<placeholder>` template stubs in `AGENTS.md` with project-specific content (this commit)
