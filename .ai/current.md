# Current Project State

## Active Initiative — None

**Status**: Idle / Up to date at NordVPN 4.5.0

### Proposed / awaiting approval

- None.

### Recently shipped

- Version mechanism refactor (2026-06-22) — replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels; moved version banner to `cont-init.d/00-version`; updated `verify.sh` to use `docker inspect`
- Streamlined build/publish workflow (2026-06-22) — added `scripts/bump.sh`, `scripts/check-version.sh`, `scripts/verify.sh`; added `task bump`, `task check-version`, `task verify`, `task release`; created GitHub Actions for weekly version detection, PR build validation, and tag-triggered publish
- AI agent docs scaffolded via `prime-ai-docs.mjs` (2026-06-23) — merged with nordvpn-specific content from session backup

### Next step

Watch for NordVPN 4.6.x release. Run version-bump workflow when available.
Weekly GitHub Action (Monday 08:00 UTC) will open a draft PR automatically if a new version is detected.

---

## Session Handoff — 2026-06-23

### What was just completed

| Commit | Change |
|--------|--------|
| — | prime-ai-docs.mjs scaffolded `.ai/` + `docs/` structure; backup at `.ai-prime-backup/2026-06-23-01-41-32/` |
| — | Merged nordvpn-specific content from backup into new template files |

### Stopping point

- Branch: `ai-base`
- Working tree: modified (AGENTS.md, CLAUDE.md, .ai/ files filled in)
- No validation run — docs-only changes

### Decisions / reasoning

- Used PRIME.md merge protocol: new file structure wins; extracted human-authored content from backup into equivalent sections
- Backup contained full AGENTS.md, CLAUDE.md, .ai/current.md — all merged into the new structure

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` project — project-specific rewrite deferred (Tier 3 / R8)
- `CLAUDE.md` pinned version block needs update after next successful bump

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved)
