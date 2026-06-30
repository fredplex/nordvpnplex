<!-- prime: version=3.0.0 template=.ai/tasks/active.md date=2026-06-30 -->
# Active Tasks

Current work in progress.

---

## Current Status

**None active — awaiting direction.** Watching for NordVPN releases and base image digest updates (both automated via GHA cron).

### Base Image Refresh Cadence (Complete)

- [x] **Phase A** — `scripts/check-base-image.sh` (local digest checker script) (2026-06-27)
- [x] **Phase B** — `.github/workflows/check-base-image.yml` (monthly cron, dev build, draft PR) (2026-06-27)
- [x] **Phase C** — `task check-base` entry in `Taskfile.yml` *(Taskfile edit explicitly approved)* (2026-06-27)
- [x] **Phase D** — doc updates (`.ai/current.md`, `active.md`, `AGENTS.md`, `docs/build-and-publish.md`) (2026-06-27)

---

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

- **AGENTS.md improvements** (2026-06-30) — 4 gaps/doc-drift fixes; `# syntax` constraint, session close rule, `.gitignore` file map, `current.md` correction.
- **prime-ai-docs v3.x template update** (2026-06-30) — workspace updated to v3 template; all project content restored from backup.
- **Base image refresh cadence (Phases A–D)** (2026-06-27) — All 4 phases implemented.
