<!-- prime: version=3.0.2 template=.ai/current.md date=2026-06-30 -->
# Current Project State

## AGENTS.md Improvements Complete (2026-06-30)

**Status**: Four gaps and one doc-drift issue identified in post-template-update onboarding assessment, all resolved. AGENTS.md now carries the `# syntax` Dockerfile constraint, a session close working rule, and the `.gitignore` file map entry. `current.md` fragile area corrected to accurately describe bump.sh behavior.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- AGENTS.md improvements (gaps + doc-drift) — 2026-06-30
- prime-ai-docs v3.x template update — 2026-06-30 (f4604c3)
- Base image refresh cadence (Phases A–D) — 2026-06-27

### Next step

Watch for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-06-30 (agents-md-improvements)

### What was just completed

| Commit | Change |
|--------|--------|
| `d5152ed` | Phase 1 — `# syntax` directive constraint added to AGENTS.md Must-not list |
| `3db5744` | Phase 2 — Session close working rule added to AGENTS.md Working Rules |
| `ddda5d2` | Phase 3 — `.gitignore` added to AGENTS.md Project File Map |
| `58ee25b` | Phase 4 — `current.md` fragile area note corrected re: bump.sh |
| this commit | Session close — current.md, active.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean after close commit
- Validation: N/A — docs/workspace change only; no source, Dockerfile, or rootfs changes

### Decisions / reasoning

- `# syntax` constraint was in CLAUDE.md but absent from AGENTS.md — added to Architecture Boundaries "Must not" list so agents that skip CLAUDE.md still see it.
- Session close rule added to Working Rules alongside existing before-starting rules — agents scanning that section now find the complete lifecycle.
- `.gitignore` in file map prevents future agents wondering whether `.ai-prime-backup/` exclusion is manual.
- `current.md` fragile area previously said "update CLAUDE.md built date by hand" — incorrect; `bump.sh` line 44 writes `${TODAY}` into CLAUDE.md automatically. Only `.ai/current.md` is manual.

### Fragile areas

- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment. Now in both CLAUDE.md and AGENTS.md.
- **Token for `task verify-live` stays outside the repo**: Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After any release PR, update this file by hand. `CLAUDE.md` (including the Built date) is handled automatically by `task bump`.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Previously Completed — prime-ai-docs v3.x Template Update (2026-06-30)

**Status**: All phases complete. Template v3.x applied; backup merge complete.

---

## Previously Completed — Base Image Refresh Cadence + Dockerfile Optimization (2026-06-26/27)

**Status**: All phases complete.

### Key versioning model decision

`IMAGE_VERSION` tracks the container, not NordVPN. A base image refresh is a first-class release: digest change + `IMAGE_VERSION` patch increment + dev build + full production publish on merge.
