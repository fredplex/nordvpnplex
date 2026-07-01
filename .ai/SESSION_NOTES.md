<!-- prime: version=3.0.0 template=.ai/SESSION_NOTES.md date=2026-06-30 -->
# Session Notes

Append-only log of session closes. Newest entry at the top.
Each entry: `## Session Close — YYYY-MM-DD (task name)`

---

## Session Close — 2026-07-01 (prime-ai-docs v3.4.x template refresh)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Read-only onboarding pass — confirmed `main` at `11ccc07`, dirty working tree (8 uncommitted files), stale handoff docs vs git | — |
| 2 | Re-prime: 6 template-pure workflow/prompt files updated to current versions | `6779991` |
| 3 | Session close — current.md, active.md, SESSION_NOTES.md updated | this commit |

### Key decisions

- Investigated an in-progress script run: a 2026-07-01 script run (backup `.ai-prime-backup/2026-07-01-10-19-41/`) had updated 6 files but was never committed, leaving changes unstaged on `main`. Session resumed at GUIDE Step 5 rather than re-running the script.
- Backup-merge determination: for all 6 updated files the backup content equalled HEAD (version string + line count matched exactly) — confirming no pre-existing project customizations existed to carry over. All 6 are Template-pure per GUIDE Part 3 classification; accepted as-is. No `⚠️ CONTENT REVIEW REQUIRED` warnings; no placeholders.
- Updated files: `definition-of-done.md` (3.0.1→3.0.2), `implementation.md` (3.0.3→3.0.4), `session-close.md` (3.0.5→3.0.6), `execute-plan-prompt.md` (3.0.0→3.0.1), `intermediate-phase-prompt.md` (3.0.0→3.0.1), `session-close-prompt.md` (3.0.0→3.0.1).
- Runtime artifacts (`.ai-prime-manifest.json`, `.ai-prime-versions.json`) left unstaged in the prime commit per GUIDE Step 6. A separate manifest-refresh commit can follow if desired (precedent: `11ccc07`).
- Verification gates N/A: workspace-only markdown change, no source/Dockerfile/rootfs/runtime behavior touched. No static gate exists in this Docker/Taskfile stack.

### Stopping point

- Working tree: clean of task work (6 template files committed at `6779991`). Runtime artifacts intentionally unstaged.
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs changes.

### Fragile areas

- `definition-of-done.md` (freshly updated template) still references `npm run validate:local` / `npm run test:e2e` and still contains the Web UI/BFF + API/Backend archetype sections — none applicable to this Docker/Taskfile stack. Archetype prune + npm-command correction is a separate `chore(docs):` task, not done this session.
- Handoff docs (`current.md`, `SESSION_NOTES.md`) were stale vs git at session start — they stopped at the v3.4.1 re-prime and did not mention `72d60b6` (prime-ai-docs-update merge) or `11ccc07` (manifest refresh). Corrected this session via the close entry.

---

## Session Close — 2026-06-30 (prime-ai-docs v3.4.1 re-prime)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Re-prime: AGENTS.md backup merge (3.0.1 → 3.0.2) + 3 workflow file updates | `23f4059` |
| 2 | Session close — current.md, active.md, SESSION_NOTES.md, completed.md | this commit |

### Key decisions

- Dry-run scenario: Re-prime (4 would-update, 0 would-create). GUIDE.md and prime-prompt.md both up-to-date — no stale-guide stop needed.
- AGENTS.md was regenerated from generic template (⚠️ CONTENT REVIEW REQUIRED). Full backup merge from `.ai-prime-backup/2026-06-30-12-19-02/` — all project content restored.
- New template additions kept: `prompts/` Required Reading entry, `manifest.json` version note, AGENTS.md self-update Working Rule in "Keep the Onboarding Path Current".
- Web/API env setup paragraph removed from Quick Start — not applicable to this Docker/Taskfile project.
- Three workflow files (onboarding, implementation, session-close) accepted as-is — all template-pure improvements, no project customisations.
- Runtime artifacts (`.ai-prime-manifest.json`, `.ai-prime-versions.json`) left unstaged per GUIDE.md Step 6.

### Stopping point

- Working tree: clean after close commit (runtime artifacts intentionally unstaged)
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs changes

---

## Session Close — 2026-06-30 (agents-md-improvements)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Phase 1 — `# syntax` Dockerfile constraint added to AGENTS.md Must-not list | `d5152ed` |
| 2 | Phase 2 — Session close working rule added to AGENTS.md Working Rules | `3db5744` |
| 3 | Phase 3 — `.gitignore` added to AGENTS.md Project File Map | `ddda5d2` |
| 4 | Phase 4 — `current.md` fragile area note corrected re: bump.sh built date | `58ee25b` |
| 5 | Session close — current.md, active.md, SESSION_NOTES.md, plan archived | this commit |

### Key decisions

- `# syntax` constraint was present in CLAUDE.md but absent from AGENTS.md; added to Architecture Boundaries so agents that read AGENTS.md only still see the build-breaking constraint.
- Session close rule added to Working Rules to complete the agent lifecycle coverage (before/during/after now all have entries).
- `current.md` fragile area was wrong: `bump.sh` writes `${TODAY}` into CLAUDE.md's Built date automatically (verified at line 44 of bump.sh). Only `.ai/current.md` requires manual update after a release PR.
- Plan file archived to `.ai/plans/archive/` via `git mv` per session-close protocol.

### Stopping point

- Working tree: clean after close commit
- Validation: N/A — docs/workspace change only; no source, Dockerfile, or rootfs changes

---

## Session Close — 2026-06-30 (prime-ai-docs v3.x template update)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Applied prime-ai-docs v3.x template via `npx github:fredplex/vibe-coding-template .` | `f4604c3` |
| 2 | Backup merge: all project-specific content restored from `.ai-prime-backup/2026-06-30-10-56-56/` | `f4604c3` |
| 3 | Session close — current.md, active.md, definition-of-done.md archetype prune, SESSION_NOTES.md | this commit |

### Key decisions

- "New file's structure wins" — all project-specific content carried over into new v3 template structure; old files never copied wholesale.
- Template-pure files (new workflows, prompts, on-demand stubs) accepted as-is.
- `definition-of-done.md` archetype prune: Web UI/BFF and API/Backend sections deleted; CLI/Container section kept.
- `engineering-rules.md` and `security-rules.md`: Web/API sections deleted as N/A; CLI/Container sections kept.
- Stale merge-state in backup `current.md` (base-image-refresh listed as "awaiting merge") confirmed already resolved in git history — updated to reflect actual completed state.
- `.gitignore` created to exclude `.ai-prime-backup/` from version control.

### Stopping point

- Working tree: clean after close commit
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs files changed

---

## Session Close — 2026-06-27 (base image refresh cadence implementation)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Phase A: Local check script `scripts/check-base-image.sh` created & marked executable | `89f71f5` |
| 2 | Phase B: GitHub Actions workflow `.github/workflows/check-base-image.yml` created | `aba8a41` |
| 3 | Phase C: Taskfile command `task check-base` added | `f412b4b` |
| 4 | Phase D: Updated current status, active tasks, AGENTS.md, and build-and-publish.md | `6716c56` |
| 5 | Post-plan docs: Documented rebuilding/refreshing base image options in README.md and user-guide.md | `801daa6` |
| 6 | Memory: Updated architecture and project state memory with base refresh cadence details | `18940b2` |

### Key decisions

- Fully followed Autonomous mode checklist: recorded pre-run commit hash (`297dd095fb1fee57803f7f85ac20935bf1cf8426`), validated and committed each phase individually, and waited for owner approval before remote push.
- Verified local check script execution under Git Bash to prevent Windows path/WSL mangling issues.

### Stopping point

- **Status**: Complete — all 4 phases of base image refresh cadence implemented. Branch `chore/base-image-refresh-plan` successfully pushed to origin and merged.
- **Branch**: `main` (after merge)
- **Working tree**: Clean
- **Versioning model confirmed**: `IMAGE_VERSION` tracks the container. A base image digest bump = first-class release: digest change + IMAGE_VERSION patch increment + dev build + full production publish on merge.

### Fragile areas

- Shell script line endings must strictly preserve LF endings to prevent bad interpreter issues.
- `scripts/check-base-image.sh` uses `docker buildx imagetools inspect`. Ensure BuildKit/Buildx is active and integrated with Docker Desktop.
- Monthly cron trigger executes on the 1st of each month at 09:00 UTC. Ensure secrets `DOCKER_USERNAME` and `DOCKER_TOKEN` are active for automated draft PR/dev builds.

---

## Session Close — 2026-06-27 (base image refresh — plan only, on hold)

### Completed this session

| # | Item |
|---|------|
| 1 | Full onboarding pass — confirmed `main` at `1e44fd7`, clean working tree, stable maintenance posture |
| 2 | Audited the base image update gap: digest pinned 2026-06-26, no detection or refresh mechanism exists |
| 3 | Wrote `.ai/plans/base-image-refresh.md` — comprehensive plan covering problem statement, audit, all owner decisions, and full workflow/script designs |
| 4 | All 5 owner decisions resolved (see plan §Owner Decisions) |
| 5 | Branch `chore/base-image-refresh-plan` created; plan committed and pushed |

### Key decisions

- **Versioning model clarified**: `IMAGE_VERSION` tracks the container, not NordVPN. Any rebuild for any reason — base refresh, security fix, config bug, NordVPN bump — produces a new `IMAGE_VERSION`. This is the authoritative statement going forward.
- **Base refresh = first-class release**: A base image digest bump always pairs with a `IMAGE_VERSION` patch increment, triggers a dev build, and fires the full production release pipeline on merge. Same process as a NordVPN version bump.
- **Monthly cadence**: GHA cron `0 9 1 * *` (1st of each month, 09:00 UTC).
- **Dev build on detection**: Yes — mirrors `check-nordvpn-release.yml` pattern; a pre-tested dev image is available on Docker Hub before the owner reviews the draft PR.
- **`task check-base` approved**: Taskfile.yml modification approved for Phase C.
- **`apt-get upgrade` revisit**: Deferred — revisit after first successful monthly base refresh.

### Stopping point

- Branch: `chore/base-image-refresh-plan`
- Working tree: plan committed and pushed; awaiting owner direction to implement

---

## Open Issues

- README.md needs project-specific rewrite (Tier 3 — not yet approved); `docs/user-guide.md` content feeds this
