# Active Tasks

Current work in progress.

---

## Current Status

**Active**: None.

Last completed: Unified build & release pipeline (2026-06-23, branch `feature/unified-builds`, commits `3cbf9f5`…`ce02c0b`).

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

### README.md rewrite (Tier 3 — deferred, not yet approved)

**Status**: Deferred
**Goal**: Replace the upstream `bubuntux/nordvpn` mirror with a project-specific README
**Note**: `docs/user-guide.md` content feeds this when approved

---

## Recently Completed

- **Unified build & release pipeline** (2026-06-23, `feature/unified-builds`) — GHA-centric release on PR merge, daily checker with auto-dev build, manual prod/dev run options, and updated docs (§3.5, §4.4, §5)
- **Dev build & publish workflow** (2026-06-23, `feature/dev-workflow`) — `task dev-build`, `dev-push`, `dev-latest`, `dev-clean`; `publish-dev.yml` CI workflow with smoke tests; WSL2 docs; cross-platform scripts
- Owner user guide — `docs/user-guide.md` created (2026-06-23, commit d5e1002)
- Quick build checklist — `docs/quick-build-checklist.md` created (2026-06-23)
- AI agent docs scaffolded via `prime-ai-docs.mjs` (2026-06-23)
- Merged backup AGENTS.md, CLAUDE.md, .ai/current.md into new template structure (2026-06-23)
- Filled in all new template files with nordvpn-specific content (2026-06-23)
- Version mechanism refactor (2026-06-22) — `/.version` → `ENV IMAGE_VERSION` + OCI labels
- Build/publish workflow streamlining (2026-06-22) — bump.sh, check-version.sh, verify.sh; task release; 3 GitHub Actions
