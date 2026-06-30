<!-- prime: version=3.0.2 template=.ai/current.md date=2026-06-30 -->
# Current Project State

## Base Image Refresh Cadence Implemented (2026-06-27)

**Status**: Base image refresh cadence fully implemented. Diagnostic script, GHA cron workflow, and Taskfile integration are active. Branch `chore/base-image-refresh-plan` merged to `main`.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Base image refresh cadence (Phases A–D) — 2026-06-27 (`chore/base-image-refresh-plan`, merged)
- Dockerfile optimization (Phases 0–5 + merge) — 2026-06-26 (`chore/dockerfile-optimization`)
- prime-ai-docs v3.x template update — 2026-06-30 (`chore/prime-template-update`, in progress)

### Next step

Watch for both the next NordVPN release (daily cron) and the next base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-06-30 (prime-template-update)

### What was just completed

| Commit | Change |
|--------|--------|
| — | prime-ai-docs v3.x template update applied via `npx github:fredplex/vibe-coding-template .` |
| — | Backup merge: all project-specific content restored from `.ai-prime-backup/2026-06-30-10-56-56/` |

### Stopping point

- Branch: `chore/prime-template-update`
- Working tree: template files merged; commit pending owner review
- Validation: not applicable (docs-only change)

### Decisions / reasoning

- Template v3 adds new workflow files (`definition-of-done.md`, `session-close.md`), new prompt files (`prime-prompt.md`), and new on-demand folders (`integrations/`, `assessments/`, `debug/`, `knowledge/`).
- All project-specific content restored from backup: AGENTS.md, CLAUDE.md, mutation-rules.md, project-state.md, architecture-decisions.md, all docs/, engineering-rules.md, security-rules.md, current.md, active.md, completed.md, SESSION_NOTES.md.
- Template-pure files (new workflows, prompts) accepted as-is — they are improvements.
- `.ai/README.md` updated: new phase text restored, new workflow file list used (definition-of-done.md, session-close.md replace validation.md, review.md per template v3 structure).

### Fragile areas

- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment. BuildKit is satisfied by `DOCKER_BUILDKIT=1` in Taskfile or CI buildx.
- **Token for `task verify-live` stays outside the repo**: Lives in a scratchpad path. Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After merging a release PR, update this file and `CLAUDE.md` built date by hand.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Previously Completed — Dockerfile Optimization + Base Image Refresh (2026-06-26/27)

**Status**: All phases complete, merged to `main`.

### Key versioning model decision

`IMAGE_VERSION` tracks the container, not NordVPN. A base image refresh is a first-class release: digest change + `IMAGE_VERSION` patch increment + dev build + full production publish on merge.
