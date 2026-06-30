<!-- prime: version=3.0.0 template=.ai/tasks/active.md date=2026-06-30 -->
# Active Tasks

Current work in progress.

---

## Current Status

**Active**: Watching for both NordVPN releases and base image updates. Draft PRs and dev builds are automated.

### Base Image Refresh Cadence (Complete)

- [x] **Phase A** — `scripts/check-base-image.sh` (local digest checker script) (2026-06-27)
- [x] **Phase B** — `.github/workflows/check-base-image.yml` (monthly cron, dev build, draft PR) (2026-06-27)
- [x] **Phase C** — `task check-base` entry in `Taskfile.yml` *(Taskfile edit explicitly approved)* (2026-06-27)
- [x] **Phase D** — doc updates (`.ai/current.md`, `active.md`, `AGENTS.md`, `docs/build-and-publish.md`) (2026-06-27)

---

- [x] Deep analysis of Dockerfile + all rootfs scripts, build tooling, CI workflows, .gitattributes, .dockerignore, git index permissions
- [x] Master plan written + all 7 owner questions answered (2026-06-26)
- [x] Branch `chore/dockerfile-optimization` created from `main`
- [x] **Phase 0** — baseline captured: build OK, size 110.2 MB, verify 3/4 (MSYS on Windows)
- [x] **Phase 1** — zero-risk hygiene complete (2026-06-26)
- [x] **Phase 2** — COPY --chmod=0755 complete (2026-06-26)
- [x] **Phase 3** — base image digest pin complete (2026-06-26)
- [x] **Phase 4** — wireguard→wireguard-tools + explicit iptables complete (2026-06-26)
- [x] **Phase 5** — HEALTHCHECK complete (2026-06-26)
- [x] **Phase 6** — documentation sync complete (2026-06-26)

**Dockerfile optimization COMPLETE** — all 6 phases merged to `main`.

### prime-ai-docs v3.x template update (In Progress)

- [x] Template applied via `npx github:fredplex/vibe-coding-template .` on branch `chore/prime-template-update`
- [x] Backup merge: all project-specific content restored from `.ai-prime-backup/2026-06-30-10-56-56/`
- [ ] Commit and push `chore/prime-template-update`
- [ ] Owner reviews and merges to `main`

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
- [ ] `CLAUDE.md` pinned version block updated

### README.md rewrite (Tier 3 — deferred, not yet approved)

**Status**: Deferred
**Goal**: Replace the upstream `bubuntux/nordvpn` mirror with a project-specific README
**Note**: `docs/user-guide.md` content feeds this when approved

---

## Recently Completed

- **prime-ai-docs v3.x template update** (2026-06-30, `chore/prime-template-update`) — In progress; backup merge complete.
- **Base image refresh cadence (Phases A–D)** (2026-06-27, `chore/base-image-refresh-plan`, merged) — All 4 phases implemented.
- **Dockerfile optimization plan** (2026-06-25/26, `chore/dockerfile-optimization`, merged) — All 6 phases complete.
