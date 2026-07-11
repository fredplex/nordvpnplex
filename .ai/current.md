<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Dockerfile Follow-up Review (2026-07-11)

**Status**: Plan written — `.ai/plans/dockerfile-followup-review.md` captures a fresh review
of `Dockerfile` (52 lines) against current `HEAD`, distinguishing already-completed work
(per the 2026-06-26 changelog entry and the two prior optimization plans) from three
still-open concerns. The plan tiers findings and gates implementation behind owner approval
for the two Tier 2 items. Awaiting owner direction on which phases to implement.

### Findings (still-open)

| # | Finding | Tier |
|---|---|---|
| 1 | Missing `--no-install-recommends` on `apt-get install` (Dockerfile:25) — pulls recommended-but-not-required packages | 1 (safe, reversible) |
| 2 | `apt-get upgrade -y` contradicts the digest-pinned base (`BASE_DIGEST`, Dockerfile:1-2) — runtime no longer matches the pinned base | 2 (owner tradeoff: reproducibility vs. security patching) |
| 3 | Shell-form `CMD` chain (Dockerfile:52) leaves `nord_watch` unable to receive `SIGTERM` — `sh` is PID 1, doesn't forward signals; container hits 10s kill timeout on `docker stop` | 2 (owner choice between s6 services migration and exec-form `CMD`) |

The 2026-06-26 changelog discrepancy (claim that `net-tools`/`iputils-ping` were removed;
current Dockerfile still installs them) is flagged in the plan but explicitly out of scope
— source is runtime truth per AGENTS.md.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Dockerfile Follow-up Review — 2026-07-11
- Version Logs Release Gap — 2026-07-10
- Container Startup Version Logs — 2026-07-09

### Next step

Awaiting owner direction on which Dockerfile Follow-up Review phases to implement. None
queued beyond the plan. Watching for the next NordVPN release (daily cron) and base image
digest refresh (monthly cron).

**Future work logged**: Reconsider `apt-get upgrade` — plan Phase 2 covers this; once the
base-refresh cadence has run successfully a few times, evaluate removing `apt-get upgrade`
from the Dockerfile to honor the digest-pinned base image.

---

## Session Handoff — 2026-07-11 (Dockerfile Follow-up Review)

### What was just completed

| Commit | Change |
|--------|--------|
| `825740e` | Added `.ai/plans/dockerfile-followup-review.md` — findings, tiers, phased implementation plan for three still-open Dockerfile concerns |

### Stopping point

- Working tree: clean. One commit made this session (`825740e`).
- Final pre-integration static gate (`task docker-build`) could not run — Docker Desktop
  daemon not running locally. Owner approved proceeding: session's only change is a
  docs-only plan markdown file; no `Dockerfile` or `rootfs/**` touched. CI guards will
  re-validate when a runtime change is made later.

### Decisions / reasoning

- **Reviewed `Dockerfile` against the prior two optimization plans** (`dockerfile-optimization.md`,
  `dockerfile-optimizations-1.md`, both completed 2026-06-26 per changelog) to avoid
  re-listing already-landed work. The follow-up plan explicitly catalogs 9 already-done
  items and out-scope them.
- **Tier 2 items gated behind owner approval** — the plan does not pre-decide `apt-get upgrade`
  removal (matches `.ai/current.md` Future Work note parking that decision) or the `CMD`
  signal-handling fix (s6 migration is an architectural change, owner's call between the
  full fix and the smaller `exec`-form half-measure).
- **Plan flagged a changelog/source mismatch** the prior 2026-06-26 entry claims
  `net-tools`/`iputils-ping` were removed; the current `Dockerfile:25` still installs them.
  Out of scope for the plan itself — flagged so the next maintainer trusts source over the
  changelog summary.

### Fragile areas

- **Docker Desktop daemon not running locally this session** — `task docker-build` could not
  execute as the final pre-integration gate. Not a repo issue; flagged in case it recurs.
- Carried forward: s6 init daemon capability requirements during stateless `task verify` on
  local Docker Desktop setups.
- Carried forward: local `bash` PATH ambiguity on Windows (WSL `bash.exe` vs Git Bash) —
  prepending `C:\Program Files\Git\bin` to `PATH` resolves it. Not a repo issue.
