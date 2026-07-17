<!-- prime: version=3.0.4 template=.ai/workflows/definition-of-done.md date=2026-07-17 -->
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
- [ ] Human approval obtained at the mode's defined gate — per phase in Supervised mode; at session-close integration in Autonomous mode.

---

## Review Checklist

### Container / Docker Build Archetype
- [ ] `task docker-build` completes without errors on the local machine.
- [ ] `task verify` passes all 4 credentialless smoke tests.
- [ ] iptables OUTPUT policy is DROP inside the container (kill-switch functional).
- [ ] nordvpnd socket present at `/run/nordvpn/nordvpnd.sock` after startup.

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
