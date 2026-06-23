# Onboarding Workflow

How to start working effectively in this codebase.

---

## Reading Order

Read in this order before making any changes:

1. `AGENTS.md` — entry point, product boundaries, required reading map
2. `docs/README.md` — product documentation overview
3. Core product docs:
   - `docs/project-rules.md`
   - `docs/architecture.md`
   - `docs/tech-stack.md`
   - `docs/testing.md`
4. `.ai/README.md` — agent workspace overview
5. `.ai/current.md` — live handoff state
6. `.ai/SESSION_NOTES.md` (last entry only)
7. `.ai/tasks/active.md` — what is in flight or queued next
8. `.ai/memory/project-state.md` — current product posture
9. `.ai/rules/mutation-rules.md` — what mutations are allowed
10. `.ai/memory/architecture-decisions.md` — architectural model
11. `.ai/rules/engineering-rules.md` — implementation rules

## Reading Scope Filter

**Always read**: the entry path above + the active plan named by `.ai/current.md`

**Read by task type**:
- UI/frontend work: `docs/ui-patterns.md` (if it exists) and related assessments
- CLI/library work: relevant usage docs and integration specs
- Mutable-action work: `.ai/rules/mutation-rules.md` and affected route plans
- Integration work: the matching `.ai/integrations/` quick-ref
- Tests: `docs/testing.md` and any test audit

**Treat as historical unless directly relevant**:
- `.ai/plans/archive/`, `.ai/debug/archive/`, `docs/archive/`
- Older migration notes, old investigations, completed plans

If source, git, `.ai/current.md`, `.ai/tasks/active.md`, and `.ai/SESSION_NOTES.md` disagree, report the mismatch. Current source/git + `.ai/current.md` are usually the best signal.

---

## Reporting Back (Before Writing Code)

After reading, report back with:

- **Current State** (3–5 bullets): what is done, branch/commit, in-progress work
- **Next Task**: quote exactly from `.ai/current.md` or `.ai/tasks/active.md`
- **Ambiguity**: if multiple options are listed, call them out
- **Fragile Areas**: from session notes / current status

Do not write code, edit files, run formatters, or execute write actions until the report is confirmed.

---

## Creating a Task Branch

Once the onboarding report is approved and the next task is assigned, the very first write action must be:

```bash
git checkout -b feature/<short-name>   # new feature or enhancement
git checkout -b fix/<short-name>       # bug fix
git checkout -b chore/<short-name>     # refactor, tooling, docs
```

All development commits must occur on this branch. Direct commits to `main` are forbidden.

---

## Common Pitfalls

### ❌ Don't
- Import infrastructure adapters or external services from inside domain/business logic
- Commit directly to `main`
- Skip validation commands
- Add mutations without approval
- Create new components without checking shared primitives first

### ✅ Do
- Read relevant docs before changing unfamiliar areas
- Follow existing patterns
- Run validation commands
- Keep changes focused
- Use calm operational wording
