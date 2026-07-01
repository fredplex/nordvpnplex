# Definition of Done — Project-Specific Fix Plan

Created: 2026-07-01 | Status: Pending review

## Background

`.ai/workflows/definition-of-done.md` is a template file that ships with archetype-agnostic
placeholder content. It currently references `npm run validate:local` / `npm run test:e2e` as
validation gates and retains non-applicable Web UI/BFF and API/Backend archetype sections.
This project uses a Docker/Taskfile stack with no npm or Node.js. The real gates are
`task docker-build` and `task verify`.

Multiple session-close entries have flagged this as a known fragile area. The v3.5.0 re-prime
(GUIDE.md Part 2 priority #10) now explicitly calls out archetype cleanup as a post-prime step
when `⚠️ ARCHETYPE SECTIONS PRESENT` fires.

## Scope — what's in / what's out

**In:**
- Replace `npm run validate:local` with `task docker-build` (static gate)
- Replace `npm run test:e2e` with `task verify` (test/runtime gate)
- Update "What Done Means" checklist to reference `task docker-build` / `task verify`
- Delete Web UI / BFF archetype section
- Delete API / Backend Service archetype section
- Replace CLI / Library / SDK section with a Container / Docker Build archetype section
  tailored to this project's actual validation patterns
- Clean up Shared Quality Standards > Testing section (removes coverage/unit-test language
  that doesn't apply to shell-based smoke tests)

**Out:**
- No changes to other template files
- No changes to `engineering-rules.md` or `security-rules.md` (already pruned)
- No runtime, source, Dockerfile, or rootfs changes

## Changes

### `docs/definition-of-done.md` (project does not maintain a separate copy — edit the `.ai/` copy only)

The file to edit is `.ai/workflows/definition-of-done.md`:

| Line(s) | Current | Replacement |
|---------|---------|-------------|
| 15–18 | `### Static Checks (always run)` + `npm run validate:local` block | `### Static Checks (always run)` + `task docker-build` block — "Builds the Docker image locally. Must exit 0 before any change is considered done." |
| 20–24 | `### Tests (always run if logic, templates, or runtime behavior changed)` + `npm run test:e2e` block | `### Tests (always run if logic, templates, or runtime behavior changed)` + `task verify` block — "Runs 4 credentialless smoke tests: IMAGE_VERSION check, nordvpn version, iptables kill-switch, nordvpnd socket." |
| 31–32 | `npm run validate:local` / `npm run test:e2e` in checklist | `task docker-build` / `task verify` |
| 47–52 | Web UI / BFF Archetype section | Delete |
| 54–58 | API / Backend Service Archetype section | Delete |
| 60–64 | CLI / Library / SDK Archetype section | Replace with Container / Docker Build archetype section tailored to this project |
| 70–73 | Testing section — "unit and integration tests", "coverage goals" | Replace with smoke-test verification language |

### Proposed archetype section (replacement for CLI/Library/SDK)

```markdown
### Container / Docker Build Archetype
- [ ] `task docker-build` completes without errors on the local machine.
- [ ] `task verify` passes all 4 credentialless smoke tests.
- [ ] iptables OUTPUT policy is DROP inside the container (kill-switch functional).
- [ ] nordvpnd socket present at `/run/nordvpn/nordvpnd.sock` after startup.
```

### Proposed Testing section (replacement)

```markdown
### Testing
- [ ] Logic changes confirmed via `task docker-build` + `task verify`.
- [ ] Release candidates pass `task verify-live TOKEN_FILE=<path>` (real NordLynx egress via Spain).
- [ ] Build artifacts cleaned up after testing (no dangling containers or images).
```

## Execution Order

| Step | Action | Commit Prefix |
|------|--------|---------------|
| 1 | Edit `.ai/workflows/definition-of-done.md` — replace gates, delete non-applicable archetypes, add Container archetype, update Testing section | `chore(docs):` |
| 2 | Verify no remaining `npm` references in the file | — |

## Validation

- No `npm` references remain in `.ai/workflows/definition-of-done.md`
- The file contains exactly one archetype section (Container / Docker Build)
- `task docker-build` and `task verify` are the documented validation gates
- No source, Dockerfile, or rootfs files changed — validation N/A
