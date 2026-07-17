<!-- prime: version=3.1.0 template=.ai/workflows/session-close.md date=2026-07-17 -->
# Session Close Workflow

The Handoff & Session Close Protocol — triggered by `.ai/prompts/session-close-prompt.md`.
Run these steps in order at the end of a working session.

---

## Handoff & Session Close Protocol

1. **Preflight scope check**
   - Run `git status --short --branch`.
   - Separate changes that belong to this task from unrelated or pre-existing changes.
   - Do not stage, revert, or modify unrelated local changes unless explicitly asked.

2. **Run verification gates (final pre-integration gate)** — run the gates defined in `.ai/workflows/definition-of-done.md`
   (static gate always; test gate if logic, templates, or runtime behavior changed). This is the last safety gate before the
   irreversible integration to main (PR or local merge), so run it even if a phase already passed. If a gate fails, stop and
   report. Do not commit, merge, or push unless the human explicitly approves closing with a failing gate.
   **Doc-only fast path**: if every commit since the last full-gate pass touched only handoff docs
   (`.ai/current.md`, `.ai/SESSION_NOTES.md`, `.ai/tasks/`), the static gate suffices — skip the test gate.

3. **Clean build artifacts** — confirm artifacts are clean. If a phase already cleaned them, verify; if the session was interrupted before cleanup ran, revert compile-time edits added by build tools now. Do not revert unrelated files.

4. **Update `.ai/current.md`** — completed work, stopping point, next priorities, and fragile areas.

   **Work state only — never delivery state.** Git and the PR are the only record of merge, push,
   branch, or approval status; any field naming them goes stale the instant the branch merges,
   which often happens without an agent in the loop. This is a *category* rule, not a banned-phrase
   list — "Merge X → main", "ready to merge", "PR open", and "awaiting approval" are all equally
   wrong. The **Status** line describes what was **built** (`"FEATURE_NAME complete."`), and
   **Next step** is a *work* action (`"Pick <task> from .ai/tasks/active.md"` or
   `"None queued — awaiting direction"`), never a delivery action.

   **Merge-state scan — before staging, re-read the `current.md` you just wrote:**
   - [ ] No field names a branch, PR number, "merge", "push", or "approval" as a state or next action.
   - [ ] `Next step` is a *work* action, not a *delivery* action.
   - [ ] The `## Active Initiative` Status line describes what was built, not how it shipped.

   If any check fails, rewrite that field as work state before staging.

5. **Add a session close entry to `.ai/SESSION_NOTES.md`** — add a new `## Session Close — YYYY-MM-DD (task name)`
   section immediately after the file's header block, before any existing entries (do not append to the
   bottom). Include completed items, commit hashes, decisions/reasoning, known bugs or technical debt,
   and fragile areas. Use the literal phrase `this commit` as a placeholder for the final close commit hash;
   do not attempt to substitute the hash — the entry is committed as part of the close commit, so `this commit`
   is correct as-is.

6. **Update task tracking**
   - Check off completed items in `.ai/tasks/active.md`. The same **category** rule from step 4
     applies here: do **not** write merge, PR, push, branch, or approval state into *any* field —
     not the **Current Status** line, not a task entry, not a follow-up bullet. `active.md` tracks
     work status; git tracks merge status. "Awaiting merge", "ready to merge", "PR open", and a
     branch name as a status are all wrong — they go stale the instant the branch merges or is
     deleted. Use a work-state line: `"None active — next: <task>"` or `"None active — awaiting direction"`.
   - Remove completed entries from `## Ready Follow-Ups` in `.ai/tasks/active.md`.
   - **Prune `## Recently Completed` in `active.md`** to the last 3 entries — move older items to `completed.md` as single-line archive entries: `- Task name (commit, YYYY-MM-DD)`. `active.md` is the **single owner** of the recent-completions list — do not duplicate it in `current.md`.
   - Keep the onboarding path current if priorities or start-here guidance changed.
    - If a plan's status is `Complete` (set in its final phase commit — see `implementation.md`), move the plan file using `git mv .ai/plans/<name>.md .ai/plans/archive/<name>.md` — **not** a bare `mv`. A bare `mv` removes the file from the working tree but leaves it tracked in the git index, causing a duplicate to appear in the merge diff and requiring a clean-up commit after every merge. Archiving happens **here, in the close commit, before integration** — there is no post-merge archive step.
    - If the plan's status is not `Complete`, do **not** archive it — leave it in `.ai/plans/` for the next session and note its incomplete status in `current.md`.
   - **Archetype cleanup**: if `⚠️ ARCHETYPE SECTIONS PRESENT` appeared during this session's prime/re-prime (see `.ai/GUIDE.md` Part 2), delete the non-applicable archetype sections from `definition-of-done.md` and `engineering-rules.md` now. The script detects this automatically — no need to track session number, just watch for the warning.

7. **Memory check**
   - If the session produced stable, reusable, cross-session codebase facts, update the appropriate `.ai/memory/` file.
   - If not, state that no durable memory update was needed.
   - Never store transient task status, secrets, raw logs, or unresolved hypotheses in memory.

8. **Verify documentation sync**
   - Confirm each behavioral commit this session already synced both the relevant `docs/` file **and** its `.ai/` working copy (doc sync is a per-phase requirement — see *Documentation Sync* in `.ai/workflows/implementation.md`). If any commit missed its pair, sync it now.
   - **Active docs scan — mandatory before closing**: Check `AGENTS.md` and every `docs/` file for staleness in two passes:
     - **Numeric claims**: check the numeric claims **affected by this session's changes** — file counts if files were added or removed, test counts if tests changed (compare against `task verify` output), version numbers if versions were bumped. Verify each against actual project state. A full-corpus sweep of every number in `AGENTS.md` + `docs/` is required only when explicitly requested, not every close.
     - **Structural sections**: if this session changed architecture, key boundaries, tech stack, or validation commands — verify the corresponding `AGENTS.md` sections (Architecture, Key Boundaries, Validation, Quick Reference) still reflect the current state.
     If any claim or section is stale, fix it in a `chore(docs):` commit before closing.
   - Both layers must reflect all changes before the session closes.

9. **Integrate to main — with human approval**
   - **This is the only point in the entire workflow where the task branch is integrated to
     `main` — and in Autonomous mode, the only push.** Plan execution never delivers; this step does.
   - Stage and commit all remaining handoff files, docs, and notes to the task branch.
   - Choose the integration path and confirm it with the human:
     - **PR flow (recommended for protected repos):** push the task branch, then request human review and a Pull Request. Do **not** check out `main` locally. No stash needed.
     - **Local merge flow:** if the working tree is still dirty after committing handoff files, run `git stash` to prevent checkout blocks; then checkout `main` → pull → merge task branch → push `main` → `git stash pop` → delete the task branch.
   - **If a merge conflict occurs:** stop immediately. Do not attempt to auto-resolve. Report the conflicting files and the merge command that was run. Wait for explicit human instructions before making any further changes.
   - Stop and request explicit human approval before executing the chosen path.
   - Once approved, execute it and report the result.

10. **Final summary** — stopping point, validation results, final merge commit hash, and pushed branch state.
