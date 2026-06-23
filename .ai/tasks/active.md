# Active Tasks

Current work in progress.

---

## Current Status

**Active**: None.

Last completed: Merged nordvpn-specific content from `.ai-prime-backup/2026-06-23-01-41-32/` into all new template files (2026-06-23).

---

## Blocked Candidates

*None.*

---

## Ready Follow-Ups

### Watch for NordVPN 4.6.x release

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

---

## Recently Completed

- AI agent docs scaffolded via `prime-ai-docs.mjs` (2026-06-23)
- Merged backup AGENTS.md, CLAUDE.md, .ai/current.md into new template structure (2026-06-23)
- Filled in all new template files with nordvpn-specific content (2026-06-23):
  - `.ai/memory/project-state.md`
  - `.ai/memory/architecture-decisions.md`
  - `.ai/rules/mutation-rules.md`
  - `docs/architecture.md`
  - `docs/tech-stack.md`
  - `docs/project-rules.md`
  - `docs/feature-state.md`
  - `docs/testing.md`
- Version mechanism refactor (2026-06-22) — `/.version` → `ENV IMAGE_VERSION` + OCI labels
- Build/publish workflow streamlining (2026-06-22) — bump.sh, check-version.sh, verify.sh; task release; 3 GitHub Actions
