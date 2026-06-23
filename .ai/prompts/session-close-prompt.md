# Session Close Prompt

We are ready to wrap up this task and close this session.

Please execute the Handoff & Session Close Protocol defined in `.ai/workflows/implementation.md`.

1. **Preflight scope check**
   - Inspect `git status --short --branch`.
   - Identify which changes belong to this task and which are unrelated or pre-existing.
   - Do not stage, revert, or modify unrelated user/local changes unless I explicitly ask.

2. **Run verification gates**
   - Run `npm run validate:local`.
   - Run the appropriate runtime gate (`npm run test:e2e` for runtime-affecting changes).
   - If validation fails, stop and report. Do not commit or push unless I explicitly approve closing with a failing gate.

3. **Clean dev-environment changes**
   - Revert compile-time modifications made by build tools if present.
   - Do not revert unrelated files.

4. **Update handoff state**
   - Update `.ai/current.md` with completed work, stopping point, next priorities, and fragile areas.
   - Prepend a session close entry to `.ai/SESSION_NOTES.md` with completed items, commit hashes, decisions/reasoning, known bugs or technical debt, and fragile areas.
   - Use "this commit" for the final close commit hash if it is not known yet.

5. **Update task tracking**
   - Check off completed items in `.ai/tasks/active.md`.
   - Move completed tasks to `.ai/tasks/completed.md` when appropriate.
   - Keep the onboarding path current if priorities or start-here guidance changed.

6. **Memory check**
   - Review whether this session produced stable, reusable, cross-session facts about the codebase.
   - If yes, update the appropriate `.ai/memory/` file.
   - If no, state that no durable memory update was needed.
   - Do not put transient task status, secrets, raw logs, or unresolved hypotheses in memory.

7. **Sync product docs when behavior changed**
   - If codebase behavior, public APIs, architecture, feature state, or user-facing workflows changed, update the relevant `docs/` files and matching `.ai/` guidance.

8. **Merge to main and push with human approval**
   - Stage and commit all remaining handoff files, docs, and notes to your task branch.
   - Formulate the Git merge process (checkout main → pull → merge task branch → push main).
   - **Stop and request explicit human approval before executing this merge and push sequence.**
   - Once approved, execute the merge, push `main`, and clean up the task branch.

9. **Final summary**
   - Summarize the stopping point, validation results, final merge commit hash, and pushed branch state.
