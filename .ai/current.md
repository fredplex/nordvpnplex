<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## prime-ai-docs v3.4.x template refresh (2026-07-01)

**Status**: AI workspace template-pure files refreshed. Six workflow/prompt files updated to current template versions; all accepted as-is (no project-specific content to merge).

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- prime-ai-docs v3.4.x template refresh — 2026-07-01 (6779991)
- prime-ai-docs v3.4.1 re-prime — 2026-06-30 (23f4059)
- AGENTS.md improvements (gaps + doc-drift) — 2026-06-30

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-07-01 (prime-ai-docs v3.4.x template refresh)

### What was just completed

| Commit | Change |
|--------|--------|
| `6779991` | Re-prime: 6 template-pure workflow/prompt files updated to current versions |
| this commit | Session close — current.md, active.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean of task work (6 template files committed). Runtime artifacts `.ai-prime-manifest.json` / `.ai-prime-versions.json` left unstaged per GUIDE Step 6.
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs changes.

### Decisions / reasoning

- A script run on 2026-07-01 (backup `.ai-prime-backup/2026-07-01-10-19-41/`) updated 6 files but was never committed, leaving changes unstaged on `main`. Session picked up at GUIDE Step 5: moved the unstaged changes onto a fresh task branch, completed the backup-merge determination, and committed.
- Backup-merge determination: for all 6 files the backup content equalled HEAD (version string + line count matched exactly) — no pre-existing project customizations existed to carry over. All 6 are Template-pure per GUIDE Part 3 classification; accepted as-is.
- Updated files: `definition-of-done.md` (3.0.1→3.0.2), `implementation.md` (3.0.3→3.0.4), `session-close.md` (3.0.5→3.0.6), `execute-plan-prompt.md` (3.0.0→3.0.1), `intermediate-phase-prompt.md` (3.0.0→3.0.1), `session-close-prompt.md` (3.0.0→3.0.1).
- Runtime artifacts intentionally left unstaged in the prime commit, matching the documented pattern. A separate manifest-refresh commit can follow if desired (precedent: `11ccc07`).

### Fragile areas

- **`definition-of-done.md` references npm commands that don't exist in this project**: the freshly-updated template still lists `npm run validate:local` / `npm run test:e2e` as the static/test gates, and still contains the Web UI/BFF and API/Backend archetype sections. This project has no npm (Docker/Taskfile stack; real gates are `task docker-build` / `task verify`). Archetype prune and npm-command correction are a separate `chore(docs):` task — not done this session.
- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment. In both CLAUDE.md and AGENTS.md.
- **Token for `task verify-live` stays outside the repo**: Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After any release PR, update this file by hand. `CLAUDE.md` (including the Built date) is handled automatically by `task bump`.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Previously Completed — prime-ai-docs v3.4.1 Re-prime (2026-06-30)

**Status**: Workspace re-primed to template v3.4.1. AGENTS.md backup merge complete. Three workflow files updated with template improvements (onboarding.md, implementation.md, session-close.md).

---

## Previously Completed — Base Image Refresh Cadence + Dockerfile Optimization (2026-06-26/27)

**Status**: All phases complete.

### Key versioning model decision

`IMAGE_VERSION` tracks the container, not NordVPN. A base image refresh is a first-class release: digest change + `IMAGE_VERSION` patch increment + dev build + full production publish on merge.
