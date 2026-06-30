<!-- prime: version=3.0.2 template=.ai/current.md date=2026-06-30 -->
# Current Project State

## prime-ai-docs v3.x Template Update Complete (2026-06-30)

**Status**: Template updated to v3.x. Backup merge complete — all project-specific content restored. New workflow files (`definition-of-done.md`, `session-close.md`) and on-demand stubs (`integrations/`, `assessments/`, `debug/`, `knowledge/`) added.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- prime-ai-docs v3.x template update — 2026-06-30 (f4604c3)
- Base image refresh cadence (Phases A–D) — 2026-06-27
- Dockerfile optimization (Phases 0–5) — 2026-06-26

### Next step

Watch for both the next NordVPN release (daily cron) and the next base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-06-30 (prime-template-update)

### What was just completed

| Commit | Change |
|--------|--------|
| `f4604c3` | prime-ai-docs v3.x template update applied; backup merge complete |
| this commit | Session close — current.md, active.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean after close commit
- Validation: N/A — docs/workspace change only; no source, Dockerfile, or rootfs changes

### Decisions / reasoning

- Template v3 adds: `definition-of-done.md`, `session-close.md`, `GUIDE.md`, `prime-prompt.md`, four `_TEMPLATE.md` on-demand stubs, `.gitignore`.
- Backup merge: all project-specific content restored from `.ai-prime-backup/2026-06-30-10-56-56/` — AGENTS.md, CLAUDE.md, mutation-rules.md, project-state.md, architecture-decisions.md, all docs/, engineering-rules.md, security-rules.md, current.md, active.md, completed.md, SESSION_NOTES.md.
- Template-pure files (new workflows, prompts) accepted as-is — structural improvements.
- `definition-of-done.md` archetype prune: Web UI/BFF and API/Backend sections removed; CLI/Container kept.
- Stale merge-state in backup `current.md` (`"awaiting merge"` for base-image-refresh) confirmed resolved — git log shows those commits are already on main.

### Fragile areas

- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment.
- **Token for `task verify-live` stays outside the repo**: Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After any release PR, update this file by hand. `CLAUDE.md` (including the Built date) is handled automatically by `task bump`.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Previously Completed — Base Image Refresh Cadence + Dockerfile Optimization (2026-06-26/27)

**Status**: All phases complete.

### Key versioning model decision

`IMAGE_VERSION` tracks the container, not NordVPN. A base image refresh is a first-class release: digest change + `IMAGE_VERSION` patch increment + dev build + full production publish on merge.
