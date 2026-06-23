# Current Project State

## Active Initiative — None

**Status**: Idle / Up to date at NordVPN 4.5.0

### Proposed / awaiting approval

- None.

### Recently shipped

- Dev build & publish workflow (2026-06-23, `feature/dev-workflow`) — `task dev-build`, `task dev-push`, `task dev-latest`, `task dev-clean`; new `publish-dev.yml` CI workflow with smoke tests; updated all product docs
- Owner user guide (2026-06-23, `docs/user-guide`) — `docs/user-guide.md` created: complete owner reference covering all task commands, GitHub Actions, both version bump paths, full env var table, Docker Hub setup, and troubleshooting
- Quick build checklist (2026-06-23, `docs/quick-build-checklist`) — added a one-page operator reference for local build, verify, bump, release, and troubleshooting steps
- prime-ai-docs 1.1.0 template update (2026-06-23) — AGENTS.md updated to template 1.1.0; `.ai/README.md` updated to 1.0.1; `.ai-prime-versions.json` added
- AI agent collaboration system (2026-06-23) — prime-ai-docs.mjs scaffold + all placeholder sections filled with nordvpn-specific content
- Version mechanism refactor (2026-06-22) — replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels; moved version banner to `cont-init.d/00-version`
- Streamlined build/publish workflow (2026-06-22) — `task bump`, `task check-version`, `task verify`, `task release`; 3 GitHub Actions

### Next step

Watch for NordVPN 4.6.x release. Weekly GitHub Action (Monday 08:00 UTC) will open a draft PR automatically. Run `task check-version` to check manually.

When the next bump lands: merge PR → `task docker-build` → `task verify` → `task release`.

---

## Session Handoff — 2026-06-23 (feature/dev-workflow)

### What was just completed

| # | Item |
|---|------|
| 1 | `Taskfile.yml` — added `dev-build`, `dev-push`, `dev-latest`, `dev-clean` tasks |
| 2 | `.github/workflows/publish-dev.yml` — new CI workflow with smoke tests |
| 3 | `docs/build-and-publish.md` — added §3.5 Dev workflow + §4.4 Manual dev publish |
| 4 | `docs/user-guide.md` — added §9 Dev builds + Publish Dev subsection in §4 |
| 5 | `docs/quick-build-checklist.md` — added Dev Build (Testing) section |
| 6 | `docs/feature-state.md` — added 5 dev workflow entries |
| 7 | `.ai/current.md` — updated handoff (this file) |

### Stopping point

- Branch: `feature/dev-workflow` — all commits pushed, ready to merge to `main`
- Working tree: clean
- All 7 planned steps implemented + 5 follow-up fixes

### Decisions / reasoning

- Dual tagging (`:dev` + `:dev-<hash>`) provides both convenience and traceability
- CI smoke tests (3 stateless checks) run before reporting success; runtime daemon check deferred
- `task dev-latest` always builds with the newest available version (even if same as pinned)
- CI input `"latest"` auto-discovers from NordVPN repo — no manual version lookup
- Inline bash scripts extracted to `scripts/dev-*.sh` for cross-platform compatibility (Windows needs WSL2 + Git Bash)
- WSL2 requirement documented in README.md, build-and-publish.md, user-guide.md, and quick-build-checklist.md

### Fragile areas

- `:dev` tag is overwritten on every push — not for production; users must switch back to `:latest`
- CI smoke tests pull then run the dev image — adds ~30s to the workflow; acceptable for manual trigger
- Windows users must have WSL2 + Docker Desktop WSL integration enabled for dev tasks
- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3 deferred

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved); `docs/user-guide.md` content feeds this
