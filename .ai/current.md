<!-- prime: version=3.0.2 template=.ai/current.md date=2026-06-30 -->
# Current Project State

## prime-ai-docs v3.4.1 Re-prime Complete (2026-06-30)

**Status**: Workspace re-primed to template v3.4.1. AGENTS.md backup merge complete. Three workflow files updated with template improvements (onboarding.md, implementation.md, session-close.md).

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- prime-ai-docs v3.4.1 re-prime — 2026-06-30 (23f4059)
- AGENTS.md improvements (gaps + doc-drift) — 2026-06-30
- prime-ai-docs v3.x template update — 2026-06-30 (f4604c3)

### Next step

Watch for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-06-30 (prime-ai-docs v3.4.1 re-prime)

### What was just completed

| Commit | Change |
|--------|--------|
| `23f4059` | Re-prime: AGENTS.md backup merge + 3 workflow files updated |
| this commit | Session close — current.md, active.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean after close commit (`.ai-prime-manifest.json` and `.ai-prime-versions.json` left unstaged — runtime artifacts)
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs changes

### Decisions / reasoning

- Re-prime detected via `prime-prompt.md` + `GUIDE.md` Part 1. Dry-run scenario: Re-prime (4 would-update, no would-create).
- GUIDE.md and prime-prompt.md both reported "Up to date" — execution context was current, no stale-guide stop needed.
- AGENTS.md (3.0.1 → 3.0.2): regenerated from template; full backup merge from `.ai-prime-backup/2026-06-30-12-19-02/`. New template additions kept: `prompts/` Required Reading entry, `manifest.json` version note, AGENTS.md self-update Working Rule. Project-specific sections all restored (Version Bump Workflow, Project File Map, Env Vars, GHA Workflows, Known Issues, Before Ending a Session rule).
- `onboarding.md` (3.0.0 → 3.0.1): new AGENTS.md staleness check during read-only pass.
- `implementation.md` (3.0.2 → 3.0.3): doc-sync checklist now explicitly calls out AGENTS.md Architecture and Key Boundaries; upkeep note expanded.
- `session-close.md` (3.0.4 → 3.0.5): Step 8 AGENTS.md scan broadened to structural sections.
- Web/API environment setup paragraph in new Quick Start removed (not applicable — no .env, Docker/Taskfile project).

### Fragile areas

- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment. In both CLAUDE.md and AGENTS.md.
- **Token for `task verify-live` stays outside the repo**: Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After any release PR, update this file by hand. `CLAUDE.md` (including the Built date) is handled automatically by `task bump`.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Previously Completed — AGENTS.md Improvements + prime-ai-docs v3.x Template Update (2026-06-30)

**Status**: All complete. AGENTS.md gaps closed (# syntax constraint, session close rule, .gitignore entry, current.md doc-drift fix). Template v3.x backup merge done.

---

## Previously Completed — Base Image Refresh Cadence + Dockerfile Optimization (2026-06-26/27)

**Status**: All phases complete.

### Key versioning model decision

`IMAGE_VERSION` tracks the container, not NordVPN. A base image refresh is a first-class release: digest change + `IMAGE_VERSION` patch increment + dev build + full production publish on merge.
