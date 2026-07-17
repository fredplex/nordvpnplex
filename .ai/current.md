<!-- prime: version=3.0.3 template=.ai/current.md date=2026-07-17 -->
# Current Project State

## Active Initiative — None

**Status**: No active implementation initiative. AI Docs Re-prime + Backup Merge (2026-07-17) is complete — re-primed the `.ai/`/`docs/` workspace to vibe-coding-template v3.7.9 and merged the real project-specific content back in from `.ai-prime-backup/2026-07-17-13-33-46/`, which the re-prime run had overwritten with generic scaffold placeholders across `AGENTS.md`, `CLAUDE.md`, `docs/`, and most of `.ai/`.

> Recent completions live in `.ai/tasks/active.md` (last 3) and `SESSION_NOTES.md` (full
> history) — this file does not duplicate them.

### Next step

Pick up Dockerfile Follow-up Review from `.ai/tasks/active.md` — owner direction still
needed on which phases to implement (Phase 1 is Tier 1 safe-win; Phases 2 & 3 need owner
decision). Watching for the next NordVPN release (daily cron) and base image digest refresh
(monthly cron). Separately, `.ai/plans/definition-of-done-fix.md` has been sitting `Pending
review` since 2026-07-01 — its archetype-section item was picked up incidentally this
session, but its Testing-section rewrite is still open and needs an owner decision on
whether to proceed.

**Future work logged**:
- Reconsider `apt-get upgrade` — plan Phase 2 covers this; once the base-refresh cadence has
  run successfully a few times, evaluate removing `apt-get upgrade` from the Dockerfile to
  honor the digest-pinned base image.
- Refresh `docs/tech-stack.md` (NordVPN pinned version shown as 5.1.0; Dockerfile is actually
  on 5.2.0) and `docs/feature-state.md` (`Recently Shipped` predates the concurrency fix and
  the 5.5.6 base-image bump) — both were already stale before this session's re-prime and
  were restored faithfully as-is, not refreshed.

---

## Session Handoff — 2026-07-17 (AI Docs Re-prime + Backup Merge)

> Commit-level completion records live in `SESSION_NOTES.md` — this section records only
> the stopping point, decisions, and fragile areas.

### What was just completed

| Commit | Change |
|--------|--------|
| `0543cd7` | `chore: prime AI agent workspace via vibe-coding-template` — merged real content from `.ai-prime-backup/2026-07-17-13-33-46/` back into all 29 files the re-prime had regenerated |
| `d006dc0` | `chore: update AI prime manifest to version 3.7.9 and refresh file statuses` (auto-generated) |
| `this commit` | Session close — current.md, active.md, completed.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean on `chore/prime-ai-docs-update` at `0543cd7` (+ `d006dc0`).
- Static gate (`task docker-build`) not run — Docker Desktop not running locally. This
  session touched only `.ai/`, `docs/`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` — no
  `Dockerfile`/`rootfs/**`/`scripts/**`/`Taskfile.yml`/workflow changes, so nothing the gate
  validates was in scope. Owner approved closing on that basis.

### Decisions / reasoning

- **Treated `.ai/current.md`, `.ai/tasks/active.md`, `.ai/tasks/completed.md`,
  `.ai/SESSION_NOTES.md`, and `.ai/README.md` as requiring a merge**, even though
  `.ai/GUIDE.md` Part 3's classification table lists most of these as "Template-pure" —
  they are append-only session/task logs holding real project history, not template
  boilerplate. The re-prime had wiped `SESSION_NOTES.md` from 589 real lines to one generic
  scaffold line, and `tasks/completed.md` similarly.
- **Re-applied the CLI/container-only archetype trim** to `.ai/rules/engineering-rules.md`
  and `.ai/rules/security-rules.md` — the re-prime had regenerated all three archetype
  variants (Web/API/CLI); this project is container/CLI-only, and the trim had already been
  done once (2026-06-30) before this re-prime reverted it.
- **Left `.ai/workflows/implementation.md`, `session-close.md`, `onboarding.md`, and
  `.ai/prompts/*` as the re-prime regenerated them** — those diffs were genuine template
  version-bump improvements (e.g. delaying push in Autonomous mode until session close), not
  content loss, so no merge was needed there.
- **Deleted the leftover Web UI/BFF and API/Backend archetype sections from
  `.ai/workflows/definition-of-done.md`'s Review Checklist**, per session-close step 6's
  archetype-cleanup instruction (the manifest still showed `hasArchetypeMarkers: true` for
  this file). Replaced them with the "Container / Docker Build Archetype" checklist already
  drafted in `.ai/plans/definition-of-done-fix.md` (Pending review since 2026-07-01), since
  that wording was already project-tailored and correct. Did **not** execute the rest of that
  plan's scope (the Testing-section rewrite) — that goes beyond the narrow archetype-deletion
  session-close asks for and hasn't been approved. The plan is left in place, not archived;
  see Fragile areas.
- **Did not refresh the pre-existing staleness** in `docs/tech-stack.md` (NordVPN 5.1.0 vs.
  actual 5.2.0) or `docs/feature-state.md` (missing recent work) — that staleness predates
  this re-prime; refreshing it is a separate task, logged above under Future work.

### Fragile areas

- **`.ai-prime-manifest.json` is tracked in git and not in `.gitignore`**, though
  `.ai/GUIDE.md` documents it as a gitignored runtime artifact (unlike
  `.ai-prime-versions.json`, which is deliberately tracked). Pre-existing inconsistency, not
  touched this session.
- **`docs/tech-stack.md` and `docs/feature-state.md` are stale** relative to the actual
  Dockerfile and recent git history — see Future work above.
- **Static gate not run this session** — Docker Desktop not running locally. Low risk since
  no build-relevant files changed, but a real gap in the pre-integration safety net if it
  recurs on a session that does touch `Dockerfile`/`rootfs/**`.
- **`.ai/plans/definition-of-done-fix.md` is still `Pending review`** — partially overlapped
  by this session's archetype cleanup (its Container/Docker Build checklist wording was
  reused), but its Testing-section rewrite item is unexecuted and unapproved. Not archived.
- Carried forward: Dockerfile Follow-up Review still-open findings (three items in
  `.ai/plans/dockerfile-followup-review.md`) awaiting owner direction.
- Carried forward: s6 init daemon capability requirements during stateless `task verify` on
  local Docker Desktop setups.
- Carried forward: local `bash` PATH ambiguity on Windows (WSL `bash.exe` vs Git Bash) —
  prepending `C:\Program Files\Git\bin` to `PATH` resolves it. Not a repo issue.
