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
npm run validate:local    # Static gate — always run
npm run test:e2e    # Runtime/test gate
```

See `.ai/workflows/validation.md` for the full gate specification.

---

## Intermediate Phase Commit Protocol

When completing a phase of a multi-phase plan:

1. Preflight: `git status` — identify only phase-relevant changes
2. Run focused validation (narrowest meaningful test set for this phase)
3. Mark phase complete in the plan file and `.ai/tasks/active.md`
4. Stage only phase files + docs/tracking updates
5. Formulate commit message — **stop and request human approval**
6. Once approved, commit and push to the task branch

---

## Handoff & Session Close Protocol

At end of session:

1. Run `npm run validate:local` — fix any failures before closing
2. Run `npm run test:e2e` if runtime behavior changed
3. Clean/revert dev-environment cache/artifacts if applicable
4. Update `.ai/current.md` — completed work, stopping point, fragile areas
5. Prepend session close entry to `.ai/SESSION_NOTES.md`
6. Update `.ai/tasks/active.md` — check off completed items
7. Memory check — did this session produce durable codebase facts? If yes, update `.ai/memory/`
8. Sync `docs/` if behavior changed
9. Stage remaining handoff files — **request human approval to merge to `main` and push**
