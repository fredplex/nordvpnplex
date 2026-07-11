<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## AGENTS.md scaffold fill (2026-07-12)

**Status**: Complete. Replaced all five `<placeholder>` template stubs in `AGENTS.md` with
project-specific content sourced from `docs/architecture.md`, `docs/project-rules.md`, and
`.ai/memory/project-state.md`. No logic, `Dockerfile`, or `rootfs/**` touched.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- AGENTS.md scaffold fill — 2026-07-12
- Dockerfile Follow-up Review — 2026-07-11
- Version Logs Release Gap — 2026-07-10

### Next step

Pick up Dockerfile Follow-up Review from `.ai/tasks/active.md` — owner direction still
needed on which phases to implement (Phase 1 is Tier 1 safe-win; Phases 2 & 3 need owner
decision). Watching for the next NordVPN release (daily cron) and base image digest refresh
(monthly cron).

**Future work logged**: Reconsider `apt-get upgrade` — plan Phase 2 covers this; once the
base-refresh cadence has run successfully a few times, evaluate removing `apt-get upgrade`
from the Dockerfile to honor the digest-pinned base image.

---

## Session Handoff — 2026-07-12 (AGENTS.md scaffold fill)

### What was just completed

| Commit | Change |
|--------|--------|
| `this commit` | Filled all five `<placeholder>` stubs in `AGENTS.md`: tech stack, current posture, Architecture section (release data flow + container startup sequence + key rules), Key Boundaries (Product Posture + Architecture Boundaries), and File Structure |

### Stopping point

- Working tree: clean after this commit.
- Static gate (`task docker-build`) could not run — Docker Desktop daemon not running locally.
  Docs-only change (`AGENTS.md` only, no `Dockerfile` or `rootfs/**` touched); CI guards will
  re-validate when a runtime change is made later.

### Decisions / reasoning

- **Sourced all content from existing authoritative docs** — `docs/architecture.md`,
  `docs/project-rules.md`, and `.ai/memory/project-state.md` — to avoid introducing drift.
- **Did not fill the `echo ok` install/dev-server commands** — those are correct for this
  project (no install or dev-server steps) and are intentional no-ops.
- **Release data flow diagram kept simpler than `docs/architecture.md`** — the AGENTS.md
  entry point benefits from a condensed summary; full diagram lives in the canonical doc.

### Fragile areas

- **Docker Desktop daemon not running locally this session** — `task docker-build` could not
  execute as the final pre-integration gate. Not a repo issue; flagged in case it recurs.
- Carried forward: Dockerfile Follow-up Review still-open findings (three items in
  `.ai/plans/dockerfile-followup-review.md`) awaiting owner direction.
- Carried forward: s6 init daemon capability requirements during stateless `task verify` on
  local Docker Desktop setups.
- Carried forward: local `bash` PATH ambiguity on Windows (WSL `bash.exe` vs Git Bash) —
  prepending `C:\Program Files\Git\bin` to `PATH` resolves it. Not a repo issue.
