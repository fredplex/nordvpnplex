<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Concurrency Deadlock Fix (2026-07-15)

**Status**: Concurrency deadlock fix complete. All three workflows (`check-base-image.yml`, `check-nordvpn-release.yml`, `publish-dev.yml`) moved to unique workflow-specific concurrency group keys with guard comments, resolving the caller/callee deadlock where `github.workflow` evaluated to the caller's name inside the reusable `publish-dev.yml` and caused both to share the group `Check Base Image-refs/heads/main`. `check-nordvpn-release.yml` had the same latent bug and was fixed in the same change.

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Concurrency Deadlock Fix — 2026-07-15
- AGENTS.md scaffold fill — 2026-07-12
- Dockerfile Follow-up Review — 2026-07-11

### Next step

Pick up Dockerfile Follow-up Review from `.ai/tasks/active.md` — owner direction still
needed on which phases to implement (Phase 1 is Tier 1 safe-win; Phases 2 & 3 need owner
decision). Watching for the next NordVPN release (daily cron) and base image digest refresh
(monthly cron). Post-merge verification for the concurrency fix: trigger each workflow via
`workflow_dispatch` on `main` and confirm no deadlock cancellation over the next few cycles.

**Future work logged**: Reconsider `apt-get upgrade` — plan Phase 2 covers this; once the
base-refresh cadence has run successfully a few times, evaluate removing `apt-get upgrade`
from the Dockerfile to honor the digest-pinned base image.

---

## Session Handoff — 2026-07-15 (Concurrency Deadlock Fix)

### What was just completed

| Commit | Change |
|--------|--------|
| `566074a` | Revised `.ai/plans/concurrency-deadlock-fix.md` with five review recs (strengthened root-cause explanation, added `check-nordvpn-release.yml`, rewrote validation section for pre-merge limitation, added session-close step, dropped `github.repository` prefix) |
| `ee11afb` | `fix(ci): unique concurrency groups to break caller/callee deadlock` — normalized concurrency groups in all three workflows + guard comments |
| `this commit` | Session close — current.md, active.md, SESSION_NOTES.md updated, plan archived |

### Stopping point

- Working tree: clean after this commit.
- Static gate (`task docker-build`) could not run — Docker Desktop daemon not running locally.
  CI YAML-only change (no `Dockerfile` or `rootfs/**` touched); CI guards on GitHub re-validate
  when the workflows next run. Post-merge verification is by absence (no deadlock cancellation
  on `main` over subsequent cron cycles + a `workflow_dispatch` trigger of each workflow).

### Decisions / reasoning

- **All three workflows fixed in one commit**, not just `check-base-image.yml` —
  `check-nordvpn-release.yml` has the identical `${{ github.workflow }}-${{ github.ref }}`
  pattern and calls `publish-dev.yml` the same way; it would deadlock the first time a
  NordVPN update is detected on a day with no other run in flight. Fixing only the observed
  failure would ship a known-broken sibling.
- **`github.repository` prefix dropped from group strings** — single-repo workflow with no
  fork-based runs; the prefix only added noise to the group string shown in the Actions UI.
- **Guard comment added at each `concurrency:` block** — explains that group keys must stay
  unique across caller + reusable workflows to prevent the pattern being copy-pasted back.

### Fragile areas

- **Docker Desktop daemon not running locally this session** — `task docker-build` could not
  execute as the final pre-integration gate. Not a repo issue; flagged in case it recurs.
- **Concurrency fix is verified by absence post-merge, not by a positive pre-merge test** —
  the deadlock only manifests on `refs/heads/main` (the group includes `github.ref`), so a
  branch-based test cannot reproduce it. Post-merge: trigger each workflow via
  `workflow_dispatch` on `main` and confirm no deadlock cancellation over the next few cycles.
- Carried forward: Dockerfile Follow-up Review still-open findings (three items in
  `.ai/plans/dockerfile-followup-review.md`) awaiting owner direction.
- Carried forward: s6 init daemon capability requirements during stateless `task verify` on
  local Docker Desktop setups.
- Carried forward: local `bash` PATH ambiguity on Windows (WSL `bash.exe` vs Git Bash) —
  prepending `C:\Program Files\Git\bin` to `PATH` resolves it. Not a repo issue.
