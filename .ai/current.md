<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Container Startup Version Logs (2026-07-09)

**Status**: Container and base image version logs added to startup. Custom log version banner is now populated using s6 environment loading, and the base image version/digest is written to `/build_version` during image compilation to display inside LSIO's standard startup branding block. Dev builds format includes both semver version and git commit hash (e.g. `5.5.4-dev+326f7ed`).

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Container Startup Version Logs — 2026-07-09
- Build & Release Pipeline Review & Optimization — 2026-07-09
- Build & release workflow hardening — 2026-07-05 (91363e0–9de8dd3)

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base image digest refresh (monthly cron).

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-07-09 (Container Startup Version Logs)

### What was just completed

| Commit | Change |
|--------|--------|
| `6291e10` | Added implementation plan for container startup version logs |
| `1aca39d` | Phase A — Updated `00-version` shebang to import container environment variables |
| `e919b52` | Phase B — Generated `/build_version` file containing nordvpnplex and base image digest versions |
| `326f7ed` | docs: revise container version log plan to include semver image versions |
| `b7198ce` | feat(build): prepend semver version to local image versions and update verify.sh |
| this commit | Phase C — Updated handoff tracking docs (`current.md`, `active.md`, `SESSION_NOTES.md`) |

### Stopping point

- Working tree: clean of task work. 6 commits on the task branch.
- Validation: Tested startup logs of the compiled container locally to confirm correct custom and base image version printing.

### Decisions / reasoning

- Prepend pinned semver version to local dev builds to ensure the user can see the image version tag in logs, while keeping the git hash for dev uniqueness and traceability.
- Used `with-contenv` shebang wrapper so `IMAGE_VERSION` variable is resolved in the early s6 init script context.
- Wrote to `/build_version` to leverage the base image's standard LSIO init branding engine.
- Scope-expanded `ARG BASE_DIGEST` to be redeclared after `FROM` so it is accessible within the docker build `RUN` context.

### Fragile areas

- s6 init daemon capability requirements during stateless `task verify` on local Docker Desktop setups.
