<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Build & Release Pipeline Review & Optimization (2026-07-09)

**Status**: Build/release pipeline optimization and documentation consolidation complete. Parameterized base image digests, simplified tag pushing in workflows, gated local Docker Hub pushes, consolidated version numbers to the Dockerfile, enabled PR runtime validation smoke-testing, and fully documented version flow patterns.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Build & Release Pipeline Review & Optimization — 2026-07-09 (this branch)
- Build & release workflow hardening — 2026-07-05 (91363e0–9de8dd3)
- Template re-prime v3.7.7 + testing.md merge — 2026-07-02 (fa82c87, 20ac94a)

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-07-09 (Build & Release Pipeline Review & Optimization)

### What was just completed

| Commit | Change |
|--------|--------|
| `4620248` | Phase A — Fixed `task bump` doc-drift and stale examples in user-guide.md, build-and-publish.md, and quick-build-checklist.md |
| `9f1b365` | Phase B — Parameterized base image digest via `ARG BASE_DIGEST` in Dockerfile and updated check-base workflows/scripts |
| `4d66654` | Phase C — Removed Changelog TODO placeholder and reminders from bump.sh and README.md |
| `57e724c` | Phase D — Consolidated redundant sections in user-guide.md and linked to canonical build-and-publish.md |
| `2f27a78` | Phase E — Optimized GHA publish workflows to build once and push from runner's Docker daemon |
| `c6ce3dd` | Phase F — Gated local Docker Hub push tasks with a confirmation script (confirm-push.sh) in Taskfile.yml |
| `180561f` | Phase G — Consolidated version source-of-truth in Dockerfile, removing duplicates from README.md and CLAUDE.md |
| `956bac2` | Phase H — Cleaned up active.md release checklist and added concurrency groups to all workflows |
| `0092d81` | Phase I — Configured PR validation workflow to run unified smoke tests (verify.sh) locally on the runner |
| `89cd08b` | Phase J — Added detailed "Versioning Design and Release Flow" documentation section to build-and-publish.md |
| this commit | Phase K — Updated handoff tracking docs (.ai/current.md, .ai/SESSION_NOTES.md, task.md) |

### Stopping point

- Working tree: clean of task work. 11 commits on branch `docs/build-release-pipeline-review`.
- Validation: Verified `check-base-image.sh` successfully parses the new Dockerfile structure. Evaluated YAML parse checks.

### Decisions / reasoning

- Executed via Autonomous mode per owner approval.
- Gated local pushes with warning script rather than deleting tasks outright, keeping human options open.
- Refactored double builds to single-build tag-and-push to speed up releases and ensure exact tested image is pushed.

### Fragile areas

- **Interactive prompt requirement**: `confirm-push.sh` checks if standard input is a TTY (`[ -t 0 ]`). It aborts in non-interactive sessions to protect against automated local push execution.
- Carried forward: s6 init daemon capability requirements during stateless `task verify` on local Docker Desktop setups; GHA commit verification warnings due to missing GPG/SSH key on Anthropic runner.
