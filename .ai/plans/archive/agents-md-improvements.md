# AGENTS.md Improvements — Gaps and Doc-Drift Fixes

**Created**: 2026-06-30
**Status**: Complete

## Background

Post-template-update onboarding assessment identified three gaps in AGENTS.md where
important constraints and protocols are absent or underspecified, plus one doc-drift
finding in `.ai/current.md` where a fragile-area note incorrectly described bump.sh
behavior.

## Scope

**In scope**:
- Add `# syntax` Dockerfile constraint to AGENTS.md "Must not" list
- Add session close protocol pointer to AGENTS.md Working Rules
- Add `.gitignore` to AGENTS.md Project File Map
- Fix `.ai/current.md` fragile area note (bump.sh DOES update CLAUDE.md built date)

**Out of scope**:
- Any source code, Dockerfile, rootfs, or script changes
- CLAUDE.md edits (its constraints block is authoritative and already correct)
- Adding `task check-base` to CLAUDE.md Quick Commands (not assessed as needed)

## Changes

### Phase 1: `# syntax` directive constraint
- **File**: `AGENTS.md`
- **Change**: Add "Add a `# syntax` directive to the Dockerfile" to the "Must not"
  list in Architecture Boundaries. Prevents agents from adding this directive, which
  triggers a 401 from Docker Hub for the BuildKit frontend in this environment.

### Phase 2: Session close working rule
- **File**: `AGENTS.md`
- **Change**: Add a "Before Ending a Session" sub-section to Working Rules, pointing
  to `session-close.md` and restating the three key rules (update handoff docs, commit,
  stop before push). Agents scanning Working Rules will now see the session close
  requirement alongside the "before starting" rules.

### Phase 3: `.gitignore` in Project File Map
- **File**: `AGENTS.md`
- **Change**: Add one line for `.gitignore` to the root block of the Project File Map.
  Prevents confusion about whether `.ai-prime-backup/` exclusion is manual.

### Phase 4: Fix current.md fragile area note
- **File**: `.ai/current.md`
- **Change**: Correct the fragile area note that says "update CLAUDE.md built date by
  hand." bump.sh line 44 updates CLAUDE.md including the Built date automatically via
  `${TODAY}`. Only `.ai/current.md` requires manual update after a release PR.

## Execution Order

| Step | Phase | Commit prefix |
|------|-------|---------------|
| 1 | `# syntax` directive constraint | `docs:` |
| 2 | Session close working rule | `docs:` |
| 3 | `.gitignore` in file map | `docs:` |
| 4 | Fix current.md fragile area note | `docs:` |

## Validation

Docs-only change — no static or test gate applies. Validation: each edit reviewed
for correctness; workspace state updated in active.md at plan completion.

## Open Questions

None — all changes are deterministic and confirmed against source (bump.sh read).
