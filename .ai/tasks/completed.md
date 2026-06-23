# Completed Tasks

Archive of completed tasks with commit hashes.

---

## 2026-06-23 — AI agent collaboration system (ai-docs-merge)

**Branch**: `ai-base` | **Commit**: `22dcb8c`

- Scaffolded `.ai/` workspace + `docs/` structure via `prime-ai-docs.mjs`
- Merged backup AGENTS.md, CLAUDE.md, `.ai/current.md` into new template structure
- Filled all 9 new template files with nordvpn-specific content (no placeholders remain):
  - `AGENTS.md` — full project overview, startup sequence, env vars table, file map, version bump workflow
  - `CLAUDE.md` — task commands, constraints, pinned version block
  - `.ai/memory/project-state.md` — approved mutation scope, forbidden ops
  - `.ai/memory/architecture-decisions.md` — 5 key decisions with rationale and gotchas
  - `.ai/rules/mutation-rules.md` — approved mutations, publish gate rules
  - `docs/architecture.md` — container startup sequence, layer responsibilities, design decisions
  - `docs/tech-stack.md` — full stack table, upgrade history, deprecated tech
  - `docs/project-rules.md` — product vision, in/out of scope, invariants
  - `docs/feature-state.md` — 21 container features + 8 tooling features, deferred items
  - `docs/testing.md` — 4-check smoke test table, troubleshooting guide

---

## 2026-06-22 — Version mechanism refactor

**Branch**: `ai-base` | **Commit**: `af4ecab`

- Replaced `/.version` file with `ENV IMAGE_VERSION` + OCI labels
- Moved version banner from CMD chain to `cont-init.d/00-version`
- Updated `verify.sh` to use `docker inspect` (no container startup for check 1)
- Deleted `rootfs/usr/bin/version_message`

---

## 2026-06-22 — Build/publish workflow streamlining

**Branch**: `ai-base` | **Commits**: `723b9db`, `c11d563`, `9a9ad72`

- Added `scripts/bump.sh`, `scripts/check-version.sh`, `scripts/verify.sh`
- Added Taskfile tasks: `bump`, `check-version`, `verify`, `release`
- Added GitHub Actions: `build-validate.yml`, `publish.yml`, `check-nordvpn-release.yml`
- Created `docs/build-and-publish.md` — full human + agent reference
