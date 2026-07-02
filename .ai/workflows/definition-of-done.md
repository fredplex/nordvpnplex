<!-- prime: version=3.0.3 template=.ai/workflows/definition-of-done.md date=2026-07-02 -->
# Definition of Done

The single gate every change passes before it is "done": the validation commands, the Done
checklist, and the review checklist. This is the source of truth — `implementation.md` (Build)
and `session-close.md` (Close) cite it rather than restating gates.

---

## Validation Gates

Before marking any task complete, run the appropriate gates:

### Static Checks (always run)
```bash
task docker-build
```
Runs the static validation gate (syntax, linting, and any type checks applicable to this stack).

### Tests (always run if logic, templates, or runtime behavior changed)
```bash
task verify
```
Runs the unit, integration, and E2E suites.

---

## What "Done" Means

A task is complete when:
- [ ] Static validation (`task docker-build`) passes with exit code 0.
- [ ] Test validation (`task verify`) passes all tests.
- [ ] Manual verification completed (browser checks for web apps; test runs for CLIs / libraries).
- [ ] Workspace state logged in `.ai/current.md` and `.ai/tasks/active.md`.
- [ ] Product docs (`docs/`) updated for any behavior, architecture, feature, rule, or tech-stack change.
- [ ] Matching `.ai/` working copy updated in the same change — no doc drift (see *Documentation Sync* in `implementation.md`).
- [ ] If scaffold file count changed: `AGENTS.md` Key rules prose **and** file-structure table verified current against manifest.
- [ ] If user-facing behavior, CLI flags, or invocation changed: `README.md` updated in the same commit.
- [ ] Human approval obtained before commit, push, or merge.

---

## Review Checklist

Choose the archetype section that matches this project and delete the others:

### Web UI / BFF Archetype — *delete if N/A*
- [ ] Client components import only feature hooks and shared UI primitives (no backend service SDKs).
- [ ] Feature hooks call same-origin API routes only.
- [ ] No secrets or internal credentials are leaked to the browser bundle.
- [ ] Every dynamic badge, counter, and status indicator has a `data-testid="{entity}-{id}-{element}"` in the same commit.
- [ ] Browser verification completed (null, empty, and happy paths).

### API / Backend Service Archetype — *delete if N/A*
- [ ] API routes validate and sanitize inputs at the entry boundary.
- [ ] API responses normalize data and redact internal database or server fields.
- [ ] Secrets stay server-side (retrieved from secure env variables).
- [ ] Boundary timeouts are bounded on external calls.

### CLI / Library / SDK Archetype — *delete if N/A*
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
For any change that alters behavior, architecture, features, rules, tech stack, or user-facing workflows, doc-sync is **mandatory in the same commit** — update both the relevant `docs/` file and its matching `.ai/` working copy; do not defer.

**Apply the doc-sync pairs table in `.ai/workflows/implementation.md` — *Documentation Sync*** for the authoritative `docs/` ↔ `.ai/` pairings. It is the single canonical table; this checklist does not restate it.
