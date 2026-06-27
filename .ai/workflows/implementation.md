# Implementation Workflow

Plan → Code → Test → Validate cycle for effective development.

---

## Implementation Cycle

```
1. Plan → 2. Code → 3. Test → 4. Validate → 5. Review → 6. Done
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

## Execution Order

| Step | Description | Commit prefix |
|------|-------------|---------------|
| 1 | Phase 1 — [brief] | `feat(domain):` |

## Validation
<What must pass before complete>

## Open Questions
<Things to resolve before or during implementation>
```

---

## 2. Code Phase

- Follow existing patterns — check similar files first
- One logical change at a time
- No opportunistic refactoring outside plan scope
- Add relevant testing hooks or test IDs for new dynamic elements if required

---

## 3. Test Phase

- Write tests as you code, not after
- Check `.ai/workflows/validation.md` for change-type validation chains

---

## 4. Validate Phase

```bash
Docker    # Static gate — always run
Docker    # Runtime/test gate
```

See `.ai/workflows/validation.md` for the full gate specification.

---

## Execution Modes

When executing a multi-phase plan, choose one of two modes:

| Mode | Use when | Human gates |
|------|----------|-------------|
| **Supervised** — Single Phase, Human-Gated | You want to review and approve each phase before it commits | After each phase (commit + push) |
| **Autonomous** — Auto-Execute Full Plan | The plan is approved; you want the agent to run all phases and only stop before pushing | Before the final push only |

Trigger **Supervised** mode with `intermediate-phase-prompt.md`.
Trigger **Autonomous** mode with `execute-plan-prompt.md`.

---

## Phase Commit Protocol

### Supervised — Single Phase, Human-Gated

Use this mode when executing one phase at a time with human approval before each commit.

1. **Preflight** — run `git status`; identify only phase-relevant changes; note any unrelated pre-existing changes but do not touch them.
2. **Confirm scope** — name the active plan file and the requested phase; confirm the phase's scoped changes before editing anything; if scope is ambiguous, stop and report — do not guess.
3. **Implement this phase only** — no opportunistic cleanup, no work from later phases.
4. **Run focused validation** — use the narrowest chain from `validation.md` for this change type; if validation fails due to this phase, fix within scope; if unrelated, stop and report.
5. **Clean build artifacts** — revert compile-time edits by build tools if present; do not revert unrelated files.
6. **Update tracking** — mark phase complete in the plan + `.ai/tasks/active.md`; update `docs/` and `.ai/memory/` if behavior, APIs, or architecture changed.
7. **Stage and formulate** — stage only phase files + docs/tracking updates; write a proposed commit message with a semantic prefix.
8. **Stop — request explicit human approval** before commit and push.
9. **Execute** — once approved, commit and push to the task branch.
10. **Report** — commit hash, committed files, validation summary, remaining local changes — **wait for instructions**.

---

### Autonomous — Auto-Execute Full Plan

Use this mode when the plan is approved and you want the agent to execute all phases in sequence, committing after each, only stopping before the final push.

**Before starting:**
- Confirm the plan is already approved by the human.
- Read all phases to understand the full scope.
- Record the pre-run commit hash: `git rev-parse HEAD` — this is the rollback point if needed.

**For each phase, in order:**

1. **Preflight** — run `git status`; identify phase-relevant changes; note unrelated changes but do not touch them.
2. **Implement this phase only** — no work from other phases, no opportunistic cleanup.
3. **Run focused validation** for this phase's change type (see `validation.md`).
   - **If validation fails**: stop immediately; print a phase-failure summary; print the suggested rollback command — `git reset --hard <pre-run-hash>` — but **do not execute it**; wait for human instructions.
4. **Clean build artifacts** if present — do not revert unrelated files.
5. **Update tracking** — mark phase complete in plan + `active.md`; update `docs/` and `.ai/memory/` as needed.
6. **Stage and commit** — stage phase files + tracking updates; commit with semantic prefix — **do not push**.
7. **Print phase-complete line** — phase name, commit hash, validation result.

**After all phases complete:**

1. Print a full run summary: all phases, commit hashes, any warnings.
2. Formulate the push command.
3. **Stop — request explicit human approval before push.**
4. Once approved: push task branch; report final pushed state.

---

## Handoff & Session Close Protocol

At end of session:

1. Run `Docker` — fix any failures before closing
2. Run `Docker` if runtime behavior changed
3. Clean/revert dev-environment cache/artifacts if applicable
4. Update `.ai/current.md` — completed work, stopping point, fragile areas
5. Prepend session close entry to `.ai/SESSION_NOTES.md`
6. Update `.ai/tasks/active.md` — check off completed items
7. Memory check — did this session produce durable codebase facts? If yes, update `.ai/memory/`
8. Sync `docs/` if behavior changed
9. Stage remaining handoff files — **request human approval to merge to `main` and push**
