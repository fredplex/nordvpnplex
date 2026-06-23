# Current Project State

## Active Initiative — None

**Status**: Idle / Up to date at NordVPN 4.5.0

### Proposed / awaiting approval

- None.

### Recently shipped

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

## Session Handoff — 2026-06-23 (docs/user-guide)

### What was just completed

| Commit | Change |
|--------|--------|
| d5e1002 | docs: add owner user guide with commands, workflows, env vars, and troubleshooting |

### Stopping point

- Branch: `docs/user-guide` — pushed, pending merge to `main`
- Working tree: clean
- Docs-only changes — no functional code modified

### Decisions / reasoning

- `docs/user-guide.md` is a new file; `docs/build-and-publish.md` stays as the detailed agent+human reference
- Mermaid diagram chosen for the main workflow flowchart (GitHub renders natively)
- Docker Hub credentials setup included in scope (was initially excluded from plan, corrected before implementation)
- `task docker-push` and `task docker-publish` documented as lower-level/bypass alternatives to `task release`
- User guide will feed the future README rewrite (Tier 3, not yet approved)

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3 deferred; `docs/user-guide.md` content feeds this when approved
- `CLAUDE.md` pinned version block needs update after next bump

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved); `docs/user-guide.md` content feeds this
