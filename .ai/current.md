# Current Project State

## Active Initiative — None

**Status**: Idle / Up to date at NordVPN 4.5.0

### Proposed / awaiting approval

- None.

### Recently shipped

- Version mechanism refactor (2026-06-22) — replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels; moved version banner to `cont-init.d/00-version`; updated `verify.sh` to use `docker inspect`
- Streamlined build/publish workflow (2026-06-22) — added `scripts/bump.sh`, `scripts/check-version.sh`, `scripts/verify.sh`; added `task bump`, `task check-version`, `task verify`, `task release`; created GitHub Actions for weekly version detection, PR build validation, and tag-triggered publish
- AI agent collaboration system (2026-06-23) — prime-ai-docs.mjs scaffold + all placeholder sections filled with nordvpn-specific content; merged from session backup

### Next step

Watch for NordVPN 4.6.x release. Weekly GitHub Action (Monday 08:00 UTC) will open a draft PR automatically. Run `task check-version` to check manually.

When the next bump lands: merge PR → `task docker-build` → `task verify` → `task release`.

---

## Session Handoff — 2026-06-23 (ai-docs-merge)

### What was just completed

| Commit | Change |
|--------|--------|
| 22dcb8c | Add AI agent collaboration system and fill in nordvpn-specific docs |
| 9a9ad72 | Add plain-language workflow recap to build-and-publish.md |
| af4ecab | Refactor version mechanism: OCI labels + ENV replaces /.version file |
| 723b9db | Add task release to simplify tag-and-push step |
| c11d563 | Add automated workflow, build tooling, and full process documentation |

### Stopping point

- Branch: `ai-base` — pushed, pending merge to `main`
- Working tree: clean
- No functional code changes this session — docs and AI agent workspace only

### Decisions / reasoning

- Used PRIME.md merge protocol: new file structure wins; extracted human-authored content from backup into equivalent sections in all new template files
- All 9 template files filled with nordvpn-specific content (no placeholders remain)
- The `.ai-prime-backup/` directory and scaffolding scripts were deleted by owner after merge completed

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` project — project-specific rewrite deferred (Tier 3 / R8)
- `CLAUDE.md` pinned version block needs update after next successful bump

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved)
