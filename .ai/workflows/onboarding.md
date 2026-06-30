<!-- prime: version=3.0.0 template=.ai/workflows/onboarding.md date=2026-06-30 -->
# Onboarding Workflow

How to start working effectively in this codebase.

> **Authority model**: This file is the single canonical onboarding protocol. `CLAUDE.md`,
> `AGENTS.md`, `onboarding-prompt.md`, and `PRIME.md` are pointers to it. None of them restate
> the reading order independently.

---

## Mandatory Reading (always, in this order)

Read these four files before anything else. Do not skip or reorder.

1. `AGENTS.md` — entry point, product boundaries, validation gates, required reading map
2. `.ai/current.md` — live handoff state: what's done, what's next, fragile areas
3. `.ai/tasks/active.md` — exact task queue and next action
4. `.ai/SESSION_NOTES.md` — last entry only

---

## Conditional Reading (read by task type)

After the mandatory four, read only the files that apply to the current task:

| If the task involves | Also read |
|---------------------|-----------|
| Writing or changing code (general development) | `.ai/rules/engineering-rules.md` |
| An active named plan in `current.md` | `.ai/plans/<name>.md` |
| Architecture or an unfamiliar codebase area | `docs/architecture.md` + `.ai/memory/architecture-decisions.md` |
| Rules, boundaries, or mutation work | `.ai/rules/mutation-rules.md` + `docs/project-rules.md` |
| Security-sensitive work | `.ai/rules/security-rules.md` |
| Testing or validation changes | `docs/testing.md` + `.ai/workflows/definition-of-done.md` |
| UI or front-end work | `docs/ui-patterns.md` (if it exists — Web/UI projects only) |
| External integration work | `.ai/integrations/<name>.md` (if it exists) |
| No task assigned yet / first session in repo | `docs/README.md`, then follow the relevant `docs/` links |

Do not read `.ai/plans/archive/`, `.ai/debug/archive/`, `docs/archive/`, or previous
SESSION_NOTES entries beyond the most recent unless the active task explicitly requires it.

---

## What to Notice While Reading

- **Source/doc mismatch**: if the source code contradicts any doc, report it under Fragile
  Areas. Treat source + `.ai/current.md` as authoritative until the human confirms otherwise.
- **Documentation drift**: if `docs/` or `.ai/` appears out of sync with the source, flag it
  under Fragile Areas. Do not fix it during this read-only pass.
- **State conflicts**: if `current.md`, `git`, `tasks/active.md`, and `SESSION_NOTES.md`
  disagree, report the mismatch. Do not resolve it — surface it.
- **Stale merge-pipeline state**: if `current.md` or `active.md` describe an "awaiting
  merge review" or "awaiting approval" state, cross-reference `git log` to determine whether
  the branch has already been merged. This is a known pattern from the PR flow close protocol —
  handoff docs are committed before the human merges, so "awaiting" language can bake into
  `main`. Flag under Fragile Areas and treat the docs as stale if `git log` confirms the
  merge has landed.
- **Stale docs identified during onboarding**: log under Fragile Areas in your report. Do not
  fix during the read-only pass. If the human confirms a stale-doc fix is the session task,
  create a task entry in `active.md` and branch before touching anything. If the human
  assigns a different task, carry the stale doc forward as a known fragile area for the next
  applicable session.

---

## Report Format (all fields required)

Report back before taking any write action. Use exactly this format:

### Current State
[3–5 bullets: recently completed work, current branch/commit, working-tree state]

### Next Task
"[exact quote from .ai/current.md or .ai/tasks/active.md — or "None queued — awaiting direction" if no task is assigned]"

### Ambiguity
[open choices, unclear scope, or decisions needed — or "None"]

### Fragile Areas
[risks, warnings, or documentation drift noticed — or "None identified"]

> If the human asks for auditability, append a **Files Read** list below Fragile Areas.

---

## First Write Action

After the human confirms the onboarding report and assigns a task, the first and only
write action before implementation is:

```bash
git checkout -b feature/<name>   # new feature or enhancement
git checkout -b fix/<name>       # bug fix
git checkout -b chore/<name>     # refactor, tooling, docs
git checkout -b docs/<name>      # documentation
```

Never commit directly to `main`. Author plan files and all task work on the task branch — not before it exists.
