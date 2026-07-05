<!-- prime: version=3.0.0 template=.ai/tasks/active.md date=2026-07-01 -->
# Active Tasks

Current work in progress.

---

## Current Status

**Active**: Build & release workflow hardening — see `.ai/plans/build-release-workflow-hardening.md`. Autonomous execution in progress on branch `claude/nordvpnplex-onboarding-a1n6pb`.

- [x] Phase A — Fix `CLAUDE.md` conflict markers + add guard to `bump.sh`
- [x] Phase B — Fix stale header comment in `check-nordvpn-release.yml`
- [x] Phase C — Correct cadence/smoke-test-count in `docs/build-and-publish.md`
- [ ] Phase D — Add Check Base Image workflow docs to `docs/user-guide.md`
- [ ] Phase E — Auto-append Changelog entries in `bump.sh` + backfill `README.md`
- [ ] Phase F — Add `verify-live` checklist item to draft PR bodies
- [ ] Phase G — Guard against concurrent bump-PR races

### Template re-prime v3.7.7 + testing.md merge (Complete)

- [x] Backup merge: `GUIDE.md` (3.5.0→3.5.3) + `definition-of-done.md` (3.0.2→3.0.3) accepted template-pure; `docs/testing.md` (3.0.4→3.0.5) merged with restored project content (`fa82c87`)
- [x] Tracked `.ai-prime-manifest.json` update from the v3.7.7 run (`20ac94a`)

### Fix check-base-image verify + docs (Complete)

- [x] Phase A — Fix `publish-dev.yml` verify bug: split build into load+verify then push steps (`2febec9`)
- [x] Phase B — Add base image explanation to `docs/architecture.md` + sync `.ai/memory/` (`6d1f7f5`)
- [x] Phase C — Expand `docs/build-and-publish.md` §4.5 with "why" context (`63549bd`)
- [x] Phase D — Cross-reference user-guide.md from new docs sections (`12ad5e6`)

### prime-ai-docs v3.5.0 re-prime (Complete)

- [x] Re-prime: GUIDE.md (3.4.0→3.5.0), implementation.md (3.0.4→3.1.0), session-close.md (3.0.6→3.0.7) (`534c709`)

### prime-ai-docs v3.4.x template refresh (Complete)

- [x] Resumed in-progress script run at GUIDE Step 5 — 6 template-pure files updated and committed (2026-07-01)

### Base Image Refresh Cadence (Complete)

- [x] **Phase A** — `scripts/check-base-image.sh` (2026-06-27)
- [x] **Phase B** — `.github/workflows/check-base-image.yml` (2026-06-27)
- [x] **Phase C** — `task check-base` entry in `Taskfile.yml` *(Taskfile edit explicitly approved)* (2026-06-27)
- [x] **Phase D** — doc updates (2026-06-27)

### Dockerfile Optimization (Complete)

- [x] All 6 phases complete (2026-06-26)

### prime-ai-docs v3.x template update (Complete)

- [x] Template applied via `npx github:fredplex/vibe-coding-template .`
- [x] Backup merge: all project-specific content restored from `.ai-prime-backup/2026-06-30-10-56-56/`

### AGENTS.md improvements — gaps and doc-drift fixes (Complete)

- [x] Phase 1 — `# syntax` directive constraint added to "Must not" list
- [x] Phase 2 — Session close working rule added to Working Rules
- [x] Phase 3 — `.gitignore` added to Project File Map
- [x] Phase 4 — `current.md` fragile area note corrected

### prime-ai-docs v3.4.1 re-prime (Complete)

- [x] Dry-run: Re-prime scenario detected (4 would-update)
- [x] Script run: AGENTS.md backup merge + 3 workflow files updated (23f4059)

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
- [ ] PR merged
- [ ] `git pull` locally
- [ ] `task docker-build` succeeds
- [ ] `task verify` passes all 4 checks
- [ ] `task release` runs cleanly (tag created and pushed)
- [ ] GitHub publish workflow completes; image appears on Docker Hub
- [ ] `.ai/current.md` updated with new versions and date

### README.md rewrite (Tier 3 — deferred, not yet approved)

**Status**: Deferred
**Goal**: Replace the upstream `bubuntux/nordvpn` mirror with a project-specific README
**Note**: `docs/user-guide.md` content feeds this when approved

---

## Recently Completed

- **Template re-prime v3.7.7 + testing.md merge** (2026-07-02) — GUIDE.md (3.5.0→3.5.3) + definition-of-done.md (3.0.2→3.0.3) accepted template-pure; docs/testing.md (3.0.4→3.0.5) merged with restored NordVPN-specific content (`fa82c87`, `20ac94a`)
- **prime-ai-docs v3.5.0 re-prime** (2026-07-01) — GUIDE.md (3.4.0→3.5.0), implementation.md (3.0.4→3.1.0), session-close.md (3.0.6→3.0.7) (`534c709`)
- **Fix check-base-image verify + docs** (2026-07-01) — fixed `publish-dev.yml` verify step (image never loaded into local daemon), added base image rationale to architecture.md and build-and-publish.md, cross-referenced user-guide.md.
