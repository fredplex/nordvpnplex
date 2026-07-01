<!-- prime: version=3.0.1 template=.ai/prompts/intermediate-phase-prompt.md date=2026-07-01 -->
# Phase Prompt — Supervised (Single Phase, Human-Gated)

I approve the plan. Please execute **Phase [N]: [Phase Name]** using the
**Supervised** mode as defined in `.ai/workflows/implementation.md`.

Active plan: `.ai/plans/<name>.md`

**Prerequisite**: onboarding pass completed this session per
`.ai/workflows/onboarding.md`. If not, stop and run onboarding first.

**Branch**: if you are not already on a task branch created during onboarding,
stop and request branch confirmation before proceeding. Do not execute on
`main`/`master`.

**Plan path**: if the path above still contains `<name>`, or the file does not
exist, list `.ai/plans/` and ask me to confirm the active plan before proceeding.

Stop before the commit and push, and request my explicit approval.
