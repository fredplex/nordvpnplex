# Current Project State

## Active Initiative — None

**Status**: Idle / Up to date at NordVPN 4.5.0

### Proposed / awaiting approval

- None.

### Recently shipped

- prime-ai-docs 1.1.0 template update (2026-06-23) — AGENTS.md updated to template 1.1.0 (Version subsection + branch-based workflow rule); `.ai/README.md` updated to 1.0.1 (current phase filled in); `.ai-prime-versions.json` added
- AI agent collaboration system (2026-06-23) — prime-ai-docs.mjs scaffold + all placeholder sections filled with nordvpn-specific content; merged from session backup
- Version mechanism refactor (2026-06-22) — replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels; moved version banner to `cont-init.d/00-version`
- Streamlined build/publish workflow (2026-06-22) — `task bump`, `task check-version`, `task verify`, `task release`; 3 GitHub Actions

### Next step

Watch for NordVPN 4.6.x release. Weekly GitHub Action (Monday 08:00 UTC) will open a draft PR automatically. Run `task check-version` to check manually.

When the next bump lands: merge PR → `task docker-build` → `task verify` → `task release`.

---

## Session Handoff — 2026-06-23 (chore/prime-template-update)

### What was just completed

| Commit | Change |
|--------|--------|
| 616fd82 | Apply prime-ai-docs 1.1.0 template updates and merge nordvpn content |

### Stopping point

- Branch: `chore/prime-template-update` — pushed, pending merge to `main`
- Working tree: clean
- Docs-only changes — no functional code modified

### Decisions / reasoning

- Script ran a second time (1.1.0) and backed up our AGENTS.md to `.ai-prime-backup/2026-06-23-02-42-16/`
- New structural additions from 1.1.0 template extracted and merged into our content — backup content not discarded
- `.ai-prime-versions.json` added: enables future smart updates (script only overwrites files with improved templates)

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3 deferred
- `CLAUDE.md` pinned version block needs update after next bump

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved)
