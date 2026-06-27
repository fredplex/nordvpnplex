# Current Project State

## Stable — Dockerfile Optimization + Template Update Shipped (2026-06-26)

**Status**: All 6 phases complete, merged to `main`, pushed. prime-ai-docs v1.2.1 template update applied and pushed.

### Just completed (Phases 0–5, `chore/dockerfile-optimization`)

- **Phase 0**: Baseline captured — image 110.2 MB, `task verify` 3/4 (MSYS on Windows pre-fix)
- **Phase 1**: Hygiene — maintainer label fix, `ARG NORDVPN_RELEASE`, curl hardening, `libc6` removal, `autoclean→clean`, `.dockerignore` expanded, shebang fixes, `verify.sh` MSYS fix, `DOCKER_BUILDKIT=1`, `task verify-live` + `scripts/connect-test.sh`, README `--restart=unless-stopped` note
- **Phase 2**: `COPY --chmod=0755` — replaces 10-line chmod block; all 19 scripts `-rwxr-xr-x` inside image confirmed
- **Phase 3**: Base image digest pin — `noble@sha256:53411508…`
- **Phase 4**: `wireguard` → `wireguard-tools`; `iptables` explicit; `net-tools`/`iputils-ping` removed. Validated by `task verify-live` (Spain #195 Madrid, NordLynx, 77.243.86.224)
- **Phase 5**: HEALTHCHECK — `--interval=60s --start-period=45s`; healthy at t=5s; verify-live PASS (Spain #170 Madrid, NordLynx, 192.145.39.2, 110.2 MB)

**Current branch**: `main` at `8257459` (pushed)

### Recently shipped

- **prime-ai-docs v1.2.1 template update** (2026-06-26, `main` `8257459`) — Template re-prime via `prime-ai-docs.mjs`. Merged backup into `docs/architecture.md` (new template structure; all Phase 6 project content, 10 architectural decisions, versioning design, new Caching Strategy + Auth Model sections) and `.ai/README.md` (restored "Stable maintenance" phase text and prompts bullet list). Added `execute-plan-prompt.md`. Updated `intermediate-phase-prompt.md`, `session-close-prompt.md`, `implementation.md`. PRIME.md added to repo.
- **Dockerfile optimization Phases 0–5 + merge to main** (2026-06-26, `7886cc8`) — Security hardening, reproducibility, health reporting. See above.
- **Dockerfile optimization plan written** (2026-06-25, planning session on `main`) — Two-pass review: initial Dockerfile-only review produced 3 recommendations (2 wrong), followed by deep analysis of all 19 rootfs scripts, Taskfile, verify.sh, bump.sh, all 3 GHA workflows, .gitattributes, .dockerignore, and git index permissions. Corrected the errors and uncovered 9 additional findings. Plan separates clear wins from owner decisions.
- Current State Audit & Workflows Unification (2026-06-24, `chore/audit-improvements`) — Performed repository-wide audit, pruned unused Web/API boilerplate in engineering/security rules, archived stale files/plans, and consolidated scrapers into `scripts/get-latest-version.sh`. Parameterized and unified CI smoke tests under `verify.sh`, and configured `publish.yml` with `paths` trigger filters. Aligned local and GHA dev builds to tag `:dev`, `:dev-<hash>`, `:dev-<version>`, and `:<image_version>-dev` (with container `IMAGE_VERSION` set to `<image_version>-dev` to mirror production metadata conventions). Updated all reference docs (`docs/architecture.md`, `docs/build-and-publish.md`, `docs/quick-build-checklist.md`, and `docs/user-guide.md`) to align with the changes.
- Native release notifications (2026-06-24, `chore/publish-native-notify`) — `publish.yml` now ends with `gh release create` (built-in `GITHUB_TOKEN`, no secrets): a GitHub Release on success emails repo watchers; native GitHub Actions emails cover failures. Documented across all five product docs with explicit agent/human/GitHub roles. Owner one-time setup: Watch → Custom → Releases.
- NordVPN 5.1.0 released (2026-06-24, PR #4 → merge `c52bd52`, bump `aa54713`) — published `fredplex/nordvpn:latest` + `:5.5.1` (NordVPN 5.1.0) to Docker Hub; git tag `5.5.1`. Validated end-to-end: CI smoke tests, dev runtime connect (Spain #189), real egress via Madrid exit IP, and the production release CD (`publish.yml` run `28110330929`).
- bump.sh no longer clobbers `.ai/current.md` (2026-06-24, `fix/bump-preserve-current-md`, merge `8cc1082`) — removed the templated overwrite; version bumps now edit only Dockerfile, README.md, CLAUDE.md. This handoff doc is maintained by hand.
- CI smoke-test fix (2026-06-24, `fix/publish-dev-smoke-test`, merge `3e80185`, fix `fc8a147`) — the "nordvpn version" smoke test in `publish-dev.yml` and `publish.yml` now runs `nordvpn --version` via `--entrypoint /bin/bash`, bypassing s6 init. Previously it ran through the default `/init` entrypoint without `NET_ADMIN`; `00-firewall` failed, s6 halted init, the CMD never ran, and the check failed with empty output (`expected '5.1.0', got ''`). Mirrors the existing `scripts/verify.sh:49` pattern.
- Unified build & release pipeline (2026-06-23, `feature/unified-builds`) — GHA-centric release on PR merge, daily checker with auto-dev build, manual prod/dev run options, and updated docs (§3.5, §4.4, §5)
- Dev build & publish workflow (2026-06-23, `feature/dev-workflow`) — `task dev-build`, `task dev-push`, `task dev-latest`, `task dev-clean`; new `publish-dev.yml` CI workflow with smoke tests; updated all product docs
- Owner user guide (2026-06-23, `docs/user-guide`) — `docs/user-guide.md` created: complete owner reference covering all task commands, GitHub Actions, both version bump paths, full env var table, Docker Hub setup, and troubleshooting
- Quick build checklist (2026-06-23, `docs/quick-build-checklist`) — added a one-page operator reference for local build, verify, bump, release, and troubleshooting steps
- prime-ai-docs 1.1.0 template update (2026-06-23) — AGENTS.md updated to template 1.1.0; `.ai/README.md` updated to 1.0.1; `.ai-prime-versions.json` added
- AI agent collaboration system (2026-06-23) — prime-ai-docs.mjs scaffold + all placeholder sections filled with nordvpn-specific content
- Version mechanism refactor (2026-06-22) — replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels; moved version banner to `cont-init.d/00-version`
- Streamlined build/publish workflow (2026-06-22) — `task bump`, `task check-version`, `task verify`, `task release`; 3 GitHub Actions

### Next step

Watch for the next NordVPN release — the daily checker auto-builds/tests a dev image and opens a draft PR. No active task.

**Future work logged**: Base-refresh cadence — periodically re-pin the base digest + rebuild (then reconsider removing `apt-get upgrade`). Not scheduled; deferred.

### Fragile areas (post-optimization)

- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment. BuildKit is satisfied by `DOCKER_BUILDKIT=1` in Taskfile or CI buildx.
- **Token for `task verify-live` stays outside the repo**: Lives in a scratchpad path. Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After merging a release PR, update this file and `CLAUDE.md` built date by hand.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Session Handoff — 2026-06-23 (feature/unified-builds)

### What was just completed

| # | Item |
|---|------|
| 1 | `.github/workflows/publish-dev.yml` — converted to reusable workflow (`workflow_call`), added `:dev-<version>` tags |
| 2 | `.github/workflows/check-nordvpn-release.yml` — upgraded to daily cron, added auto-trigger dev build & verify, updated PR template body |
| 3 | `.github/workflows/publish.yml` — redesigned to release on PR merges to main with version changes, added manual trigger, local test, and git tag push back |
| 4 | `scripts/verify.sh` — added `--entrypoint /bin/bash` override for stateless checks to avoid s6 initialization and `$HOME` errors in restricted envs |
| 5 | `.gitattributes` / file endings — normalised all text files to LF endings to prevent Windows CRLF shell script interpretation errors |
| 6 | Documentation — updated flow charts, matrices, and checklists in `docs/build-and-publish.md`, `docs/user-guide.md`, and `docs/quick-build-checklist.md` |
| 7 | Versioning design — added comprehensive versioning design summary in `docs/architecture.md` and updated `docs/feature-state.md` |

### Stopping point

- Branch: `docs/versioning-summary` — ready to merge to `main`
- Working tree: clean
- Verification: `task docker-build` and `task verify` completed successfully using version 4.6.0 override (reverted back to 4.5.0 in code)

### Decisions / reasoning

- **Two-Layer CD Safety Guard**: Release CD workflow on main merges is guarded by Dockerfile path filter AND git diff check. An unrelated PR merge (e.g. docs changes) will bypass the release build safely.
- **Auto-Dev Build validation**: Running dev builds immediately when a new NordVPN version is detected ensures the package exists and container builds succeed before the owner reviews the PR.
- **Override Entrypoint in Verify**: Bypassing s6 `/init` for `nordvpn --version` test solves environment issues where `$HOME` is unset or networking capabilities are blocked.

### Fragile areas

- **NordVPN deb removal**: NordVPN regularly deletes old deb packages from their repo. Verification of older pinned builds (like 4.5.0) can fail if they are removed; local dev-build overrides are required to verify with active versions (e.g. 4.6.0).
- **WSL2 / Line Endings**: Shell scripts must strictly preserve LF endings. Windows line-ending auto-conversion will break bash inside the container.

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved); `docs/user-guide.md` content feeds this
