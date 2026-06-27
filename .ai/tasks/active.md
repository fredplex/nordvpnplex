# Active Tasks

Current work in progress.

---

## Current Status

**On Hold**: Base image refresh plan written — awaiting agent credits to implement.

### Base Image Refresh Cadence (ON HOLD — plan approved, not yet implemented)

**Plan**: `.ai/plans/base-image-refresh.md`  
**Branch**: `chore/base-image-refresh-plan` (pushed)  
**All owner decisions resolved** — see plan §Owner Decisions.

- [ ] **Phase A** — `scripts/check-base-image.sh` (local digest checker script)
- [ ] **Phase B** — `.github/workflows/check-base-image.yml` (monthly cron, dev build, draft PR)
- [ ] **Phase C** — `task check-base` entry in `Taskfile.yml` *(Taskfile edit explicitly approved)*
- [ ] **Phase D** — doc updates (`.ai/current.md`, `active.md`, `AGENTS.md`, `docs/build-and-publish.md`)

Use **Supervised mode**: one phase per human gate. Do not batch.

---

- [x] Deep analysis of Dockerfile + all rootfs scripts, build tooling, CI workflows, .gitattributes, .dockerignore, git index permissions
- [x] Master plan written + all 7 owner questions answered (2026-06-26)
- [x] Branch `chore/dockerfile-optimization` created from `main`
- [x] **Phase 0** — baseline captured: build OK, size 110.2 MB, verify 3/4 (MSYS on Windows)
- [x] **Phase 1** — zero-risk hygiene complete (2026-06-26): maintainer fix, ARG NORDVPN_RELEASE, curl hardening, libc6 removal, autoclean→clean, .dockerignore expanded, shebang fixes, verify.sh MSYS fix, DOCKER_BUILDKIT=1, task verify-live + scripts/connect-test.sh, README --restart note. Verify: 3 passed / 0 failed.
- [x] **Phase 2** — COPY --chmod=0755 complete (2026-06-26): single COPY replaces COPY+chmod block; all scripts -rwxr-xr-x inside image confirmed; verify 3/0/1.
- [x] **Phase 3** — base image digest pin complete (2026-06-26): noble@sha256:53411508... pinned; verify 3/0/1.
- [x] **Phase 4** — wireguard→wireguard-tools + explicit iptables complete (2026-06-26): verify 3/0/1; verify-live PASS (Spain #195 Madrid, NordLynx, 77.243.86.224); size 110.2 MB.
- [x] **Phase 5** — HEALTHCHECK complete (2026-06-26): interval=60s start-period=45s; healthy at t=5s (NordLynx); verify 3/0/1; verify-live PASS (Spain #170 Madrid, NordLynx, 192.145.39.2, 110.2 MB).
- [x] **Phase 6** — documentation sync complete (2026-06-26): all docs/, .ai/, AGENTS.md, CLAUDE.md, README.md updated to reflect shipped changes.

**Dockerfile optimization COMPLETE** — all 6 phases merged to `main` (`7886cc8`).

**Watching**: next NordVPN release — the daily checker auto-builds/tests a dev image and opens a draft PR.

---

## Blocked Candidates

*None.*

## Future Work (deferred, not scheduled)

### Base-refresh cadence

**Goal**: Periodically re-pin the base digest (`noble@sha256:…`) + rebuild so OS security patches land without a manual base bump. Once this cadence exists, reconsider removing `apt-get upgrade` (currently kept as the security-patching mechanism).
**Why deferred**: No urgency right now; the digest pin + `apt-get upgrade` is the current posture.
**When to revisit**: When the base image tag diverges significantly from the pinned digest (check linuxserver.io release notes), or when a security advisory targets Ubuntu Noble base packages.

---

## Ready Follow-Ups

### Dockerfile optimization (Tier 1 + approved Tier 2)

**Status**: Plan written, awaiting owner approval
**Plan**: `.ai/plans/dockerfile-optimization.md`
**Goal**: Reduce image size, eliminate fragile build steps, fix inconsistencies

**Tier 1 (clear wins — no behavior change)**:
- [ ] Set executable bits in git for 17 rootfs scripts (`git update-index --chmod=+x`)
- [ ] Fix shebang inconsistencies in `nord_config` and `nord_watch`
- [ ] Expand `.dockerignore` (add `.ai`, `docs`, `scripts`, `Taskfile.yml`, etc.)
- [ ] Refactor Dockerfile: remove `libc6`, remove `chmod` block, fix `COPY /rootfs /` → `COPY rootfs /`

**Tier 2 (owner decisions)**:
- [ ] Remove `apt-get upgrade -y`? (tradeoff: reproducibility vs. security patching)
- [ ] Remove `net-tools` + `iputils-ping`? (unused by any script)
- [ ] Test removing `wireguard`? (may be auto-installed by NordVPN .deb)
- [ ] Add `HEALTHCHECK` instruction? (new behavior — Docker/Unraid health reporting)

### Watch for NordVPN Next release

**Status**: Waiting (no action needed — weekly GitHub Action handles detection)
**Goal**: Bump to the next NordVPN version when available

**When triggered**:
- GitHub Actions opens a draft PR automatically on Monday, OR
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

- **prime-ai-docs v1.2.1 template update** (2026-06-26, `8257459`) — Re-primed via `prime-ai-docs.mjs`. Merged backup into `docs/architecture.md` and `.ai/README.md`. Added `execute-plan-prompt.md`. PRIME.md added to repo.
- **Dockerfile optimization plan** (2026-06-25, planning session) — Two-pass review of the Dockerfile and all interacting files (19 rootfs scripts, Taskfile, verify.sh, bump.sh, 3 GHA workflows, .gitattributes, .dockerignore, git index). Produced `.ai/plans/dockerfile-optimization.md` with 12 findings tiered into clear wins (Tier 1), owner decisions (Tier 2), and future work (Tier 3). Corrected 3 wrong initial recommendations (`curl` is runtime, `chmod` block is necessary, `apt-get upgrade` is a decision point). No code changes — plan only.
- **Current State Audit & Workflows Unification** (2026-06-24, `chore/audit-improvements`) — Hygiene cleanup (boilerplate removal, file archiving), package scraping consolidation (`get-latest-version.sh`), parameterized `verify.sh` for customizable runs, CI smoke test unification, local & CI dev tag alignment (`dev`, `dev-<hash>`, `dev-<version>`, and `<image_version>-dev`), and full reference documentation updates.
- **Unified build & release pipeline** (2026-06-23, `feature/unified-builds`) — GHA-centric release on PR merge, daily checker with auto-dev build, manual prod/dev run options, and updated docs (§3.5, §4.4, §5)
- **Dev build & publish workflow** (2026-06-23, `feature/dev-workflow`) — `task dev-build`, `dev-push`, `dev-latest`, `dev-clean`; `publish-dev.yml` CI workflow with smoke tests; WSL2 docs; cross-platform scripts
- Owner user guide — `docs/user-guide.md` created (2026-06-23, commit d5e1002)
- Quick build checklist — `docs/quick-build-checklist.md` created (2026-06-23)
- AI agent docs scaffolded via `prime-ai-docs.mjs` (2026-06-23)
- Merged backup AGENTS.md, CLAUDE.md, .ai/current.md into new template structure (2026-06-23)
- Filled in all new template files with nordvpn-specific content (2026-06-23)
- Version mechanism refactor (2026-06-22) — `/.version` → `ENV IMAGE_VERSION` + OCI labels
- Build/publish workflow streamlining (2026-06-22) — bump.sh, check-version.sh, verify.sh; task release; 3 GitHub Actions
