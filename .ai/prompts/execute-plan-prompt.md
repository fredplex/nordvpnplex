<!-- prime: version=3.0.2 template=.ai/prompts/execute-plan-prompt.md date=2026-07-17 -->
# Execute Plan Prompt — Autonomous (Auto-Execute Full Plan)

I approve this plan. Please execute **all phases** using the
**Autonomous** mode as defined in `.ai/workflows/implementation.md`.

Active plan: `.ai/plans/<name>.md`

**Prerequisite**: onboarding pass completed this session per
`.ai/workflows/onboarding.md`. If not, stop and run onboarding first — it is the
source of current state, fragile areas, and the task-branch guard.

**Branch**: if you are not already on a task branch (created after onboarding
confirmation), stop and request branch confirmation before proceeding. Do not
execute on `main`/`master`.

**Plan path**: if the path above still contains `<name>`, or the file does not
exist, list `.ai/plans/` and ask me to confirm the active plan before proceeding.

After each phase passes validation, commit it automatically. If validation fails
mid-plan, stop and print the suggested rollback command(s); print but **do not
execute** them — wait for my instructions.

Do **not** push. Stop after the run summary — delivery to `main` happens once,
when I send the session-close prompt.
