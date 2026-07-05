<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Build & Release Workflow Hardening (2026-07-05)

**Status**: Build/release workflow doc-drift fixes and reliability hardening complete — fixed the `CLAUDE.md` merge-conflict corruption (and guarded `bump.sh` against it recurring), corrected stale cadence/smoke-test-count claims in `docs/build-and-publish.md`, added the missing Check Base Image workflow documentation to `docs/user-guide.md`, made `bump.sh` auto-append a Changelog entry on every run, raised the visibility of the `verify-live` gate on draft release PRs, and added a guard against the two automated bump workflows racing on the same files.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Build & release workflow hardening — 2026-07-05 (91363e0–9de8dd3)
- Template re-prime v3.7.7 + testing.md merge — 2026-07-02 (fa82c87, 20ac94a)
- prime-ai-docs v3.5.0 re-prime — 2026-07-01 (534c709)

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-07-05 (Build & Release Workflow Hardening)

### What was just completed

| Commit | Change |
|--------|--------|
| `91363e0` | Phase A — Resolved `CLAUDE.md` conflict markers; added a conflict-marker guard to `bump.sh` |
| `eb1f84f` | Phase B — Fixed stale header comment in `check-nordvpn-release.yml` (weekly→daily, manual-tag→auto-trigger) |
| `9e77dd4` | Phase C — Fixed cadence + smoke-test-count drift (weekly→daily, 3→4 checks) in `docs/build-and-publish.md` |
| `bf67f7c` | Phase D — Added Check Base Image workflow table row + subsection to `docs/user-guide.md` |
| `49b9f8d` | Phase E — `bump.sh` auto-appends a Changelog entry every run; backfilled 2 missing entries in `README.md` |
| `19ec758` | Phase F — Converted both draft-PR "Before merging" sections to checklists, calling out `verify-live` explicitly |
| `0afa08b` | Phase G — Guard step added to both bump workflows to skip if an `auto/*` PR is already open |
| `f426c4c`, `9de8dd3` | Plan tracking updates (status transitions) |

### Stopping point

- Working tree: clean, 9 commits (`91363e0` through `9de8dd3`).
- Validation: `task` CLI is not installed in this session's sandbox, so `task docker-build`/`task verify` could not run literally — no phase touched `Dockerfile` or `rootfs/`, so the production build/runtime gates are not implicated either way. Substitute checks used: `bash -n scripts/bump.sh` (syntax), `python3 -c "import yaml; yaml.safe_load(...)"` against every touched workflow file (all valid), and repo-wide `grep` confirming zero remaining conflict markers and zero remaining stale "weekly / 3 smoke tests" strings. **Recommend the owner run `task docker-build && task verify` locally as an additional confirmation.**

### Decisions / reasoning

- Executed via Autonomous mode per `.ai/workflows/implementation.md`: all 7 phases were plan-approved up front with 5 resolved owner decisions (approve the `CLAUDE.md` fix; auto-append the Changelog; checklist-only `verify-live` visibility bump, not branch-protection enforcement; all phases A–G in scope; stay on the session-designated branch rather than renaming).
- Backfilled only 2 of the "3 unlogged releases" originally flagged in the plan — deliberately excluded the workspace-only template re-prime (v3.7.7) from README's user-facing Changelog since it had zero Dockerfile/rootfs/runtime impact; it's already correctly recorded in `SESSION_NOTES.md`. Flagged as a deviation from the plan's literal text, not a silent change.
- Chose visibility-only enforcement for the `verify-live` gate (explicit PR checklist items) over investing in branch-protection/required-check enforcement, per explicit owner choice — the gate still cannot literally block a merge.

### Fragile areas

- **`verify-live` gate on the recommended automated release path is still not hard-enforced** — it's now a visible, individually-checkable PR item, but GitHub can't block merge on an unchecked markdown checkbox without branch protection / required status checks, which was explicitly out of scope this pass.
- **`bump.sh`'s Changelog auto-append writes a `<!-- TODO: expand with real details before merging -->` placeholder line** — depends on the human/agent replacing that text before merging each bump PR; if skipped repeatedly, literal TODO lines will accumulate in `README.md`.
- **This session's validation ran without the `task` CLI or a live Docker daemon build** — every check was a substitute (syntax/YAML-parse/grep), not the actual `definition-of-done.md` gates. No source/Dockerfile change was made, so risk is low, but the owner should still run the real gates locally at some point.
- Carried forward, not touched this session: archetype sections still present in `definition-of-done.md`/`engineering-rules.md` (needs an owner decision on which to keep); `.ai/GUIDE.md` Step 6's inaccurate claim that `.ai-prime-manifest.json` is gitignored; the base-image digest pin requires manual updates; the `# syntax` Dockerfile directive prohibition (401 from Docker Hub in this environment); `task verify-live` tokens must stay outside the repo; `.ai/current.md` remains hand-maintained (`bump.sh` doesn't touch it); s6 init capability quirk for stateless `docker run` checks; `AGENTS.md` still has unfilled template placeholders (Architecture, Key Boundaries, Current posture).
