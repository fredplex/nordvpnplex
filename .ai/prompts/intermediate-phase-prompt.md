# Intermediate Phase Prompt

I approve of the plan. We are ready to execute the next step of our plan: **Phase N**.

Please follow the Intermediate Phase Commit Protocol defined in `.ai/workflows/implementation.md`.

1. **Preflight scope check**
   - Inspect `git status --short --branch`.
   - Identify unrelated or pre-existing local changes.
   - Do not modify, stage, revert, or commit unrelated files unless I explicitly ask.

2. **Confirm the active plan and phase**
   - Name the active implementation plan file.
   - Confirm the requested phase and its scoped changes before editing.
   - If the requested phase does not match the active plan or the phase scope is ambiguous, stop and report the mismatch.

3. **Implement this phase only**
   - Focus strictly on the changes scoped for this phase in the active implementation plan.
   - Avoid unrelated refactoring, opportunistic cleanup, or work from later phases.

4. **Run focused validation**
   - Execute the narrowest meaningful validation for this phase.
   - If validation fails because of this phase, fix it within scope.
   - If validation fails for unrelated or broad reasons, stop and report instead of expanding scope.
   - Do not commit a failing phase unless I explicitly approve it.

5. **Clean dev-environment changes**
   - Revert compile-time edits made by build tools if present.
   - Do not revert unrelated files.

6. **Track, docs, and memory**
   - Mark the phase completed in the active plan.
   - Check off phase tasks in `.ai/tasks/active.md` when applicable.
   - If behavior, public APIs, architecture, or user-facing workflows changed, update relevant `docs/` files and matching `.ai/` guidance.
   - If the phase revealed stable, reusable codebase facts, update the appropriate `.ai/memory/` file.

7. **Stage, commit, and push with human approval**
   - Stage only files modified for this phase, plus required docs/tracking/memory updates.
   - Formulate the proposed commit message using a semantic prefix.
   - Formulate the push command.
   - **Stop and request explicit human approval before executing the commit and push.**
   - Once approved, execute the commit and push to the remote branch.

8. **Confirm readiness**
   - Report the commit hash and pushed branch.
   - List the files committed and pushed.
   - Summarize validation run and results.
   - Note any remaining unrelated local changes.
   - Confirm readiness for the next phase, then wait for my instructions.
