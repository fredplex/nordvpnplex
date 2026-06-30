<!-- prime: version=3.0.1 template=.ai/workflows/definition-of-done.md date=2026-06-30 -->
# Definition of Done

The single gate every change passes before it is "done": the validation commands, the Done
checklist, and the review checklist. This is the source of truth — `implementation.md` (Build)
and `session-close.md` (Close) cite it rather than restating gates.

---

## Validation Gates

Before marking any task complete, run the appropriate gates:

### Static Checks (always run)
```bash
docker
```
Runs the static validation gate (syntax, linting, and any type checks applicable to this stack).

### Tests (always run if logic, templates, or runtime behavior changed)
```bash
docker
```
Runs the unit, integration, and E2E suites.

---

## What "Done" Means

A task is complete when:
- [ ] Static validation (`docker`) passes with exit code 0.
- [ ] Test validation (`docker`) passes all tests.
- [ ] Manual verification completed (browser checks for web apps; test runs for CLIs / libraries).
- [ ] Workspace state logged in `.ai/current.md` and `.ai/tasks/active.md`.
- [ ] Product docs (`docs/`) updated for any behavior, architecture, feature, rule, or tech-stack change.
- [ ] Matching `.ai/` working copy updated in the same change — no doc drift (see *Documentation Sync* in `implementation.md`).
- [ ] If scaffold file count changed: `AGENTS.md` Key rules prose **and** file-structure table verified current against manifest.
- [ ] If user-facing behavior, CLI flags, or invocation changed: `README.md` updated in the same commit.
- [ ] Human approval obtained before commit, push, or merge.

---

## Review Checklist

### CLI / Container Archetype
- [ ] All dependencies are language built-ins or explicitly approved packages.
- [ ] File writes are atomic (safe temp-and-rename).
- [ ] Scoped file operations stay strictly inside the target directory boundary.
- [ ] Generators are side-effect free and output generic code.

---

## Shared Quality Standards (all archetypes)

### Testing
- [ ] Logic changes have corresponding unit and integration tests.
- [ ] Coverage goals met (happy + unhappy paths).
- [ ] Temporary files / env vars used in tests are cleaned up.

### Commit Hygiene
- [ ] One logical change per commit.
- [ ] Semantic prefixes used (`feat`, `fix`, `chore`, `test`, `refactor`, `docs`).

### Documentation Sync
For any change that alters behavior, architecture, features, rules, tech stack, or user-facing workflows:
- [ ] The relevant `docs/` file was updated in the same commit (not deferred).
- [ ] The matching `.ai/` working copy was updated in the same commit — no drift between the two layers.
- [ ] Cross-references between `docs/` and `.ai/` remain accurate and consistent.

See `.ai/workflows/implementation.md` — *Documentation Sync* for the pairs table.
