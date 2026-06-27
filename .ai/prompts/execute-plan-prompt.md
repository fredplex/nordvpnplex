# Execute Plan Prompt — Autonomous (Auto-Execute Full Plan)

I approve this plan. Please execute **all phases** using the
**Autonomous** mode as defined in `.ai/workflows/implementation.md`.

Active plan: `.ai/plans/<name>.md`

Commit after each phase automatically. If validation fails mid-plan, stop
and print the suggested rollback command before waiting for my instructions.
Stop before the final push and request my explicit approval.
