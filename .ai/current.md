<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## prime-ai-docs v3.5.0 re-prime (2026-07-01)

**Status**: AI workspace re-primed to template v3.5.0. Three template-pure workflow/guide files updated; no project-specific content to merge. Branch `chore/prime-ai-docs-update-350` at `534c709`.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- prime-ai-docs v3.5.0 re-prime — 2026-07-01 (534c709)
- Fix check-base-image verify + docs — 2026-07-01 (2febec9, 6d1f7f5, 63549bd, 12ad5e6)
- prime-ai-docs v3.4.x template refresh — 2026-07-01 (6779991)

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-07-01 (prime-ai-docs v3.5.0 re-prime)

### What was just completed

| Commit | Change |
|--------|--------|
| `534c709` | Re-prime: 3 template-pure workflow/guide files updated (GUIDE.md 3.4.0→3.5.0, implementation.md 3.0.4→3.1.0, session-close.md 3.0.6→3.0.7) |
| this commit | Session close — current.md, active.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean of task work (3 template files committed at `534c709`). Runtime artifacts `.ai-prime-manifest.json` / `.ai-prime-versions.json` left unstaged per GUIDE Step 6.
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs changes.

### Decisions / reasoning

- GUIDE.md guard fired at 3.4.0→3.5.0 — human ran the script directly. Session picked up at GUIDE Step 5 (post-script completion): moved unstaged changes from `main` onto `chore/prime-ai-docs-update-350`, completed backup-merge classification.
- Backup-merge determination: all 3 updated files (GUIDE.md, implementation.md, session-close.md) are Template-pure per GUIDE Part 3. No project-specific content lost. Backup at `.ai-prime-backup/2026-07-01-13-58-10/`.
- Template improvements: implementation.md gained per-phase Status tracking + final-phase auto-detection; session-close.md archetype cleanup now triggered by warning detection; GUIDE.md example commands normalized + archetype cleanup promoted to Part 2 priority #10.
- Runtime artifacts intentionally left unstaged in the prime commit.

### Fragile areas

- **`definition-of-done.md` references npm commands that don't exist in this project**: the freshly-updated template still lists `npm run validate:local` / `npm run test:e2e` as the static/test gates, and still contains the Web UI/BFF and API/Backend archetype sections. This project has no npm (Docker/Taskfile stack; real gates are `task docker-build` / `task verify`). Archetype prune and npm-command correction are a separate `chore(docs):` task — not done this session.
- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment. In both CLAUDE.md and AGENTS.md.
- **Token for `task verify-live` stays outside the repo**: Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After any release PR, update this file by hand. `CLAUDE.md` (including the Built date) is handled automatically by `task bump`.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.


