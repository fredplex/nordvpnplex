# Current Project State

## Active Initiative — None

**Status**: Idle / Up to date at NordVPN 4.5.0

### Proposed / awaiting approval

- None.

### Recently shipped

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

**NordVPN 5.1.0 is available** (detected by the daily checker on 2026-06-24). The auto-dev build for it failed today on the smoke-test bug now fixed on `main`. To proceed:

1. Re-run **Publish Dev to Docker Hub** (`workflow_dispatch`, `nordvpn_version: latest`) to confirm all three smoke tests pass on the corrected workflow.
2. Once green, review/merge the NordVPN 5.1.0 draft PR → GHA runs the release CD (`publish.yml`, now also fixed) to tag, build, verify, and publish.

Thereafter: watch for the next NordVPN release; the daily checker auto-builds & tests a dev image and opens a draft PR when an update is found.

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
