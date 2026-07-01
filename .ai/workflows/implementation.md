<!-- prime: version=3.0.4 template=.ai/workflows/implementation.md date=2026-07-01 -->
# Implementation Workflow

Plan → Code → Test → Validate cycle for effective development.

---

## Implementation Cycle

```
1. Plan → 2. Code → 3. Test → 4. Validate → 5. Done
     ↑                                                        │
     └────────────────────────────────────────────────────────┘
                    (iterate if needed)
```

---

## 1. Plan Phase

### Before Writing Code
- Read `.ai/current.md` — current project phase and guardrails
- Read `.ai/memory/` — current product state and boundaries
- Read `.ai/rules/` — implementation rules for the area you're touching
- Read relevant `docs/` files — full product spec if needed

### Check Boundaries
- **If adding mutation**: Must pass `.ai/rules/mutation-rules.md` approval gate
- **If changing architecture**: Review `.ai/memory/architecture-decisions.md`
- **If changing UI (for web apps)**: Review `docs/ui-patterns.md` (if it exists)

### Create Plan

**When to create a plan file** (use `.ai/plans/<name>.md`):
- The change touches more than 2 files, OR
- The change involves more than one logical concern, OR
- The scope or approach is uncertain at the start

**When a task entry is sufficient** (add a line to `.ai/tasks/active.md`):
- The change is confined to one file with one clear outcome
- No open questions about approach or scope

**Single-step changes**: Add a brief summary to `.ai/tasks/active.md`.

**Multi-step work**: Create `.ai/plans/<name>.md` using this format:

```markdown
# [Feature/Task Name]

**Created**: YYYY-MM-DD
**Status**: Pending review | In progress | Complete

## Background
<Why this is needed>

## Scope

**In scope**:
- <what this plan will change>

**Out of scope**:
- <what this plan will NOT change — be explicit>

## Changes

### Phase 1: [Name]
- **File**: `path/to/file`
- **Change**: <what and why>

### Phase 2: [Name]
- **File**: `path/to/file`
- **Change**: <what and why>

## Execution Order

| Step | Description | Commit prefix |
|------|-------------|---------------|
| 1 | Phase 1 — [brief] | `feat:` |
| 2 | Phase 2 — [brief] | `feat:` |

## Validation
<What must pass before complete>

## Open Questions
<Things to resolve before or during implementation>
```

### Plan Approval Gate

After creating a plan file, **stop**. Set the plan's `Status` to `Pending review` and end
your turn. Do not begin coding.

The human signals approval by sending one of:
- `intermediate-phase-prompt.md` — approves one phase at a time (Supervised mode)
- `execute-plan-prompt.md` — approves all phases for autonomous execution (Autonomous mode)

These prompts ARE the approval signal. Do not treat any informal "proceed" response as
equivalent — wait for the explicit prompt that names the mode.

For single-step changes logged only in `active.md`, the human's next instruction to proceed
is sufficient; no formal prompt is required.

---

## 2. Code Phase

- Follow existing patterns — check similar files first
- One logical change at a time
- No opportunistic refactoring outside plan scope
- Add relevant testing hooks or test IDs for new dynamic elements if required

---

## 3. Test Phase

- Write tests as you code, not after
- Check `.ai/workflows/definition-of-done.md` for the gates this change must pass

---

## 4. Validate Phase

Run the gates defined in `.ai/workflows/definition-of-done.md` — the static gate always, the
test gate whenever logic, templates, or runtime behavior changed. Both must pass before this change is **Done**.

`.ai/workflows/definition-of-done.md` is the single source of truth for the gate commands, the
Done checklist, and the review checklist — do not restate them here.

---

## Documentation Sync

When a change alters behavior, architecture, features, rules, tech stack, or user-facing
workflows, updating documentation is **part of the change — not optional follow-up**.
Documentation lives in two places that must stay in sync:

- `docs/` — the comprehensive product, architecture, and spec docs (full context, read by humans and agents)
- `.ai/` — the distilled working copies agents load every session (`.ai/memory/`, `.ai/rules/`, `.ai/workflows/`)

Source code is runtime truth, but docs are how the next session learns intent, boundaries,
and current state. Leaving either layer stale silently misleads the next agent.

**Rule: update both the `docs/` file and its `.ai/` working copy in the same phase/commit
as the change. Do not defer.**

| Topic | `docs/` file | `.ai/` working copy |
|-------|--------------|---------------------|
| Architecture | `docs/architecture.md` | `.ai/memory/architecture-decisions.md` + `AGENTS.md` Architecture section |
| Features / state | `docs/feature-state.md` | `.ai/memory/project-state.md` |
| Rules / boundaries | `docs/project-rules.md` | `.ai/rules/` + `AGENTS.md` Key Boundaries section |
| Testing | `docs/testing.md` | `.ai/workflows/definition-of-done.md` |
| Tech stack | `docs/tech-stack.md` | `AGENTS.md` + `.ai/memory/` |
| Scaffold file count or structure | `docs/feature-state.md` | `AGENTS.md` Key rules prose + file-structure table |
| User-facing guide | `README.md` | — (no `.ai/` copy — update `README.md` directly in the same commit) |

If a topic has no 1:1 working copy, ensure `AGENTS.md` and `.ai/memory/` still reflect it.

> **AGENTS.md upkeep** — `AGENTS.md` is the primary agent entry point; keep all sections current in the same commit as the relevant change:
> - **Architecture section**: update when architecture, data-flow, or key rules change.
> - **Key Boundaries section**: update when approved/forbidden boundaries change.
> - **Numeric claims** (test counts, file counts, version numbers in prose): hand-verify on every change that affects those numbers; prose is not updated by the prime script automatically.
> - **File-structure table / Key rules prose**: update when scaffold file count or directory structure changes.

---

## Execution Modes

When executing a multi-phase plan, choose one of two modes:

| Mode | Use when | Human gates |
|------|----------|-------------|
| **Supervised** — Single Phase, Human-Gated | High-risk or unfamiliar change; first implementation of a pattern; plan has open questions; you want to review each phase's diff before it commits | After each phase (commit + push) |
| **Autonomous** — Auto-Execute Full Plan | Well-understood, low-risk change; plan is complete and deterministic; all phases are routine; you want minimal interruptions | Before the final push only |

When uncertain, default to Supervised — it costs one extra approval per phase but preserves oversight on any unexpected finding.

Trigger **Supervised** mode with `intermediate-phase-prompt.md`.
Trigger **Autonomous** mode with `execute-plan-prompt.md`.

---

## Phase Commit Protocol

### Supervised — Single Phase, Human-Gated

Use this mode when executing one phase at a time with human approval before each commit.

1. **Preflight** — run `git status --short --branch`. **Confirm you are on a task branch (created during onboarding); if on `main`/`master`, stop and request the human create the branch first.** Identify only phase-relevant changes; note any unrelated pre-existing changes but do not touch them — if they would interfere with this phase's validation, recommend the human stash or commit them first. Do not modify, stage, revert, or commit unrelated files unless explicitly asked.
2. **Confirm scope** — name the active plan file and the requested phase; confirm the phase's scoped changes before editing anything; if the requested phase does not match the active plan, or the phase scope is ambiguous, stop and report — do not guess.
3. **Implement this phase only** — no work from other phases, no opportunistic cleanup.
4. **Run focused validation** — run the gates in `definition-of-done.md` for this change type; if validation fails due to this phase, fix within scope; if unrelated, stop and report. If the failure can't be fixed in scope, output in this format and do not stage broken files:
   - **Gate failed**: [which command]
   - **Exit code**: [N]
   - **Root cause** (agent's interpretation): [one sentence]
   - **Relevant output** (first 20 lines or the key error block): [output]
   - **Rollback commands**: [commands]
   Do not commit a failing phase unless the human explicitly approves it.
5. **Clean build artifacts** — revert compile-time edits by build tools if present; do not revert unrelated files.
6. **Update tracking and documentation** — update the plan's `Status` to `In progress` (if not already); mark phase complete in the plan + `.ai/tasks/active.md`. If this phase altered behavior, architecture, features, rules, tech stack, or user-facing workflows: **update both the affected `docs/` file and its `.ai/` working copy — required, not optional, in this same commit** (see *Documentation Sync* above for the pairs table).
7. **Stage and formulate** — first apply the doc-sync checklist, then stage.
   - **Apply the doc-sync pairs table from the *Documentation Sync* section above** — for every row whose topic this phase touched, update the listed `docs/` file **and** its `.ai/` working copy in this same commit. If the phase touched no listed topic, skip doc-sync.

   Stage only phase files + docs/tracking updates; write a proposed commit message with a semantic prefix that references the phase (number/name) and formulate the push command.
8. **Stop — request explicit human approval** before commit and push. Stop calling tools and end your turn; do not run the commit or push until the human approves in a new turn.
9. **Execute** — once approved, commit and push to the task branch.
10. **Report** — commit hash, committed files, validation summary, remaining local changes — **wait for instructions**.

---

### Autonomous — Auto-Execute Full Plan

Use this mode when the plan is approved and you want the agent to execute all phases in sequence, committing after each, only stopping before the final push.

**Before starting:**
- Confirm the plan is already approved by the human.
- **Confirm you are on a task branch (created during onboarding); if on `main`/`master`, stop and request the human create the branch first.**
- Read all phases to understand the full scope.
- Record the pre-run commit hash: `git rev-parse HEAD` — this is the rollback point if needed.
- **Mid-run rule:** if you discover the plan itself is flawed, stop, report the finding, and request approval before deviating — do not silently amend the plan.

**For each phase, in order:**

1. **Preflight** — run `git status`; identify phase-relevant changes; note unrelated changes but do not touch them.
2. **Implement this phase only** — no work from other phases, no opportunistic cleanup.
3. **Run focused validation** for this phase's change type (see `definition-of-done.md`).
   - **If validation fails**: stop immediately; output in this format:
     - **Gate failed**: [which command]
     - **Exit code**: [N]
     - **Root cause** (agent's interpretation): [one sentence]
     - **Relevant output** (first 20 lines or the key error block): [output]
     - **Rollback commands**: `git reset --hard HEAD && git clean -fd` (this phase only) or `git reset --hard <pre-run-hash> && git clean -fd` (full initiative) — print but **do not execute**; wait for human instructions.
4. **Clean build artifacts** if present — do not revert unrelated files.
5. **Update tracking and documentation** — update the plan's `Status` to `In progress` (if not already); mark phase complete in plan + `active.md`. If this phase altered behavior, architecture, features, rules, tech stack, or user-facing workflows: **update both the affected `docs/` file and its `.ai/` working copy in this same commit — required, not optional** (see *Documentation Sync* above).
6. **Stage and commit** — first apply the doc-sync checklist, then stage.
   - **Apply the doc-sync pairs table from the *Documentation Sync* section above** — for every row whose topic this phase touched, update the listed `docs/` file **and** its `.ai/` working copy in this same commit. If the phase touched no listed topic, skip doc-sync.

   Stage phase files + tracking updates; commit with a semantic prefix that references the phase (number/name) — **do not push**.
7. **Print phase-complete line** — phase name, commit hash, validation result.

**After all phases complete:**

1. Update the plan's `Status` to `Complete`.
2. Print a full run summary: all phases, commit hashes, any warnings.
3. Formulate the push command.
4. **Stop — request explicit human approval before push.**
5. Once approved: push task branch; report final pushed state.

---

## Session Close

When the session ends, follow the **Handoff & Session Close Protocol** in
`.ai/workflows/session-close.md` — it covers the verification gates, handoff-doc updates
(`current.md`, `SESSION_NOTES.md`, `active.md`), the memory check, documentation sync, and the
human-approved merge-to-main sequence.
