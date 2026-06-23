# Validation Workflow

Testing gates, coverage requirements, and validation chains for **nordvpn**.

---

## Validation Gates

Before marking any task complete, you must execute the appropriate validation gates:

### Static Checks (always run)
```bash
npm run validate:local
```
Runs the static validation gate (syntax, linting, and any type checks applicable to this stack).

### Tests (always run if logic or templates changed)
```bash
npm run test:e2e
```
Runs unit, integration, and E2E suites.

---

## What "Done" Means

A task is complete when:
- [ ] Static validation (`npm run validate:local`) passes with exit code 0.
- [ ] Test validation (`npm run test:e2e`) passes all tests.
- [ ] Manual verification completed (e.g. browser verification for web-apps, test runs for local CLI tools).
- [ ] Workspace state logged in `.ai/current.md` and `.ai/tasks/active.md`.
- [ ] Human approval obtained before commit, push, or merge.
