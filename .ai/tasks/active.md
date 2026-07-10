<!-- prime: version=3.0.0 template=.ai/tasks/active.md date=2026-07-01 -->
# Active Tasks

Current work in progress.

---

## Current Status

### Version Logs Release Gap (In progress — branch `fix/version-logs-release-gap`)

Debugged missing startup version logs on Unraid: Docker Hub `latest` (5.5.4, published
2026-07-08 from PR #9) predates the feature (PR #12, merged 2026-07-09 without an
`IMAGE_VERSION` bump — publish gate correctly bypassed). Plan:
`.ai/plans/version-logs-release-gap.md`.

- [x] Phase A — image-only bump 5.5.4 → 5.5.5 (ship the stranded feature)
- [x] Phase B — PR guard: runtime changes must bump IMAGE_VERSION (hard fail)
- [x] Phase C — bump.sh changelog wording + stale version-doc cleanup

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

- **Build & release workflow hardening** (2026-07-05) — fixed `CLAUDE.md` conflict-marker corruption + guarded `bump.sh` against it; corrected doc-drift (cadence, smoke-test count); added Check Base Image workflow docs; auto-appending Changelog; `verify-live` checklist visibility; concurrent-bump-PR race guard (`91363e0`–`0afa08b`)
- **Template re-prime v3.7.7 + testing.md merge** (2026-07-02) — GUIDE.md (3.5.0→3.5.3) + definition-of-done.md (3.0.2→3.0.3) accepted template-pure; docs/testing.md (3.0.4→3.0.5) merged with restored NordVPN-specific content (`fa82c87`, `20ac94a`)
- **prime-ai-docs v3.5.0 re-prime** (2026-07-01) — GUIDE.md (3.4.0→3.5.0), implementation.md (3.0.4→3.1.0), session-close.md (3.0.6→3.0.7) (`534c709`)
