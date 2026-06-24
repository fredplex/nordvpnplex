# Completed Tasks

Archive of completed tasks with commit hashes.

---

## 2026-06-24 — Native release notifications (chore/publish-native-notify)

**Branch**: `chore/publish-native-notify` | **Commits**: `7c61b2a` (workflow), `add8fdc` (docs)

- Replaced `publish.yml`'s `Tag git release` step with `Publish GitHub Release` (`gh release create`, built-in `GITHUB_TOKEN`, no secrets). Creates the tag **and** a GitHub Release; publishing the Release sends GitHub's native email to repo watchers. Failures covered by native GitHub Actions emails.
- Reverted an earlier SMTP draft (third-party action + 4 secrets) in favour of the native approach.
- Documented the design + agent/human/GitHub roles across all 5 product docs (architecture.md decision block, build-and-publish.md §4.5, feature-state.md, quick-build-checklist.md, user-guide.md §7 Step 4).
- Decisions: lightweight tag accepted (notes carry context); dropped the `ref_type != 'tag'` guard so `task release` also notifies; skip backfilling existing tags.
- Plan: `.ai/plans/archive/publish-notifications.md`.
- **Owner one-time**: Watch → Custom → Releases (so success emails arrive).

---

## 2026-06-24 — NordVPN 5.1.0 release (auto/nordvpn-5.1.0, PR #4)

**Branch**: `auto/nordvpn-5.1.0` | **Bump**: `aa54713` | **Merge**: `c52bd52` | **Release run**: `28110330929`

- Bumped NordVPN `4.5.0 → 5.1.0`, IMAGE_VERSION `5.5.0 → 5.5.1` (Dockerfile, README.md, CLAUDE.md).
- Owner tested `dev-5.1.0`: clean container start, connected to Spain #189 (NordLynx/UDP), real egress confirmed via Madrid exit IP (no leak).
- Merged PR #4 → `publish.yml` release CD: 3/3 smoke tests passed, pushed `fredplex/nordvpn:latest` + `:5.5.1`, created git tag `5.5.1`.
- Naming: git/Docker version tag = IMAGE_VERSION `5.5.1`; bundled NordVPN client = `5.1.0`.

---

## 2026-06-24 — Fix bump.sh clobbering .ai/current.md (fix/bump-preserve-current-md)

**Branch**: `fix/bump-preserve-current-md` | **Fix**: `64208df` | **Merge**: `8cc1082`

- `bump.sh` did `cat > .ai/current.md` with a templated stub (CI + local variants), overwriting the human-maintained handoff doc on every bump and injecting stale `git tag && git push` instructions.
- Removed the current.md generation entirely; bumps now edit only the version-pinned files. Verified end-to-end: the regenerated checker PR (#4) contained only Dockerfile/README/CLAUDE.
- Plan: `.ai/plans/fix-bump-preserve-current-md.md`.

---

## 2026-06-24 — Fix CI nordvpn-version smoke test (fix/publish-dev-smoke-test)

**Branch**: `fix/publish-dev-smoke-test` | **Fix commit**: `fc8a147` | **Merge**: `3e80185`

- Root cause: the "nordvpn version" smoke test ran `nordvpn --version` through the image's default s6-overlay `/init` entrypoint without `NET_ADMIN`. `00-firewall`'s iptables commands fail without that capability, s6 halts init before the CMD runs, and the check failed with empty output (`expected '5.1.0', got ''`).
- Fix: override the entrypoint (`--entrypoint /bin/bash … -c "nordvpn --version"`), mirroring `scripts/verify.sh:49`. Applied to both `publish-dev.yml` and `publish.yml` (production CD had the identical latent bug).
- Added `.ai/debug/publish-dev-smoke-test-failure.md` (investigation) and `.ai/plans/fix-publish-dev-smoke-test.md` (plan).
- Recorded the s6-init/capabilities gotcha in `.ai/memory/architecture-decisions.md`.
- **Pending owner validation**: re-run **Publish Dev to Docker Hub** (`workflow_dispatch`, `nordvpn_version: latest`).

---

## 2026-06-23 — Unified build & release pipeline (feature/unified-builds)

**Branch**: `feature/unified-builds` | **Commits**: `3cbf9f5`…`ce02c0b`

- Implemented reusable dev publish GHA workflow with version-specific tags (`:dev-<version>`)
- Upgraded release checker cron to daily schedule and configured it to trigger auto-dev builds when updates are found
- Created automated PR-merge production CD pipeline that release-tags and builds when `Dockerfile` version changes are merged
- Added manual dispatch option to production/dev workflows for manual runs/rebuilds
- Updated operator guides (`docs/build-and-publish.md`, `docs/user-guide.md`, `docs/quick-build-checklist.md`)
- Normalised line endings of scripts and files to LF format to prevent Windows CRLF interpretation errors

---

## 2026-06-23 — Owner user guide (docs/user-guide)

**Branch**: `docs/user-guide` | **Commit**: `d5e1002`

- Created `docs/user-guide.md` — complete owner operational reference: all 9 task commands, 3 GitHub Actions with manual trigger instructions, both version bump paths (automated and manual), 23-row runtime env var table, Docker Hub credentials setup, 8 troubleshooting entries
- Added index entry in `docs/README.md`
- Mermaid workflow diagram; `task docker-push` / `task docker-publish` documented for first time

---

## 2026-06-23 — prime-ai-docs 1.1.0 template update (chore/prime-template-update)

**Branch**: `chore/prime-template-update` | **Commit**: `616fd82`

- `AGENTS.md` updated to template 1.1.0: added Version subsection to Required Reading; added Use a Branch-Based Workflow subsection to Working Rules; all nordvpn content preserved from backup
- `.ai/README.md` updated to template 1.0.1: filled in current phase placeholder
- `.ai-prime-versions.json` added: per-file version record enables smart updates on future re-primes

---

## 2026-06-23 — AI agent collaboration system (ai-docs-merge)

**Branch**: `ai-base` | **Commit**: `22dcb8c`

- Scaffolded `.ai/` workspace + `docs/` structure via `prime-ai-docs.mjs`
- Merged backup AGENTS.md, CLAUDE.md, `.ai/current.md` into new template structure
- Filled all 9 new template files with nordvpn-specific content (no placeholders remain):
  - `AGENTS.md` — full project overview, startup sequence, env vars table, file map, version bump workflow
  - `CLAUDE.md` — task commands, constraints, pinned version block
  - `.ai/memory/project-state.md` — approved mutation scope, forbidden ops
  - `.ai/memory/architecture-decisions.md` — 5 key decisions with rationale and gotchas
  - `.ai/rules/mutation-rules.md` — approved mutations, publish gate rules
  - `docs/architecture.md` — container startup sequence, layer responsibilities, design decisions
  - `docs/tech-stack.md` — full stack table, upgrade history, deprecated tech
  - `docs/project-rules.md` — product vision, in/out of scope, invariants
  - `docs/feature-state.md` — 21 container features + 8 tooling features, deferred items
  - `docs/testing.md` — 4-check smoke test table, troubleshooting guide

---

## 2026-06-22 — Version mechanism refactor

**Branch**: `ai-base` | **Commit**: `af4ecab`

- Replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels
- Moved version banner from CMD chain to `cont-init.d/00-version`
- Updated `verify.sh` to use `docker inspect` (no container startup for check 1)
- Deleted `rootfs/usr/bin/version_message`

---

## 2026-06-22 — Build/publish workflow streamlining

**Branch**: `ai-base` | **Commits**: `723b9db`, `c11d563`, `9a9ad72`

- Added `scripts/bump.sh`, `scripts/check-version.sh`, `scripts/verify.sh`
- Added Taskfile tasks: `bump`, `check-version`, `verify`, `release`
- Added GitHub Actions: `build-validate.yml`, `publish.yml`, `check-nordvpn-release.yml`
- Created `docs/build-and-publish.md` — full human + agent reference
