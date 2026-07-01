<!-- prime: version=3.0.3 template=AGENTS.md date=2026-07-01 -->
# AGENTS.md

Main entry point for coding agents working in this repository.

**Current source code is runtime truth.** If docs and code disagree, report the mismatch and treat source as authoritative.

---

## Quick Start

### First Time Here?

Every session — follow `.ai/workflows/onboarding.md`. It defines the mandatory reading order,
conditional reads, and report format. Do not substitute a different order.

**First time in this repo only**: Skim `docs/README.md` and `.ai/README.md` to orient yourself
to the layout, then follow `onboarding.md` as normal.

**Environment setup (Web/API projects)**: If the project uses environment variables, obtain a
`.env` file before running. Check `docs/` for where credentials are documented (team password
manager, onboarding doc, or integration notes). Never commit `.env` files.
CLI/library projects with no env var requirements can skip this.

### Commands

```bash
echo ok    # Install dependencies
echo ok    # Start dev server
task docker-build    # Full static validation gate
task verify    # Runtime / E2E gate
```

---

## Project Context

**nordvpnplex** — Custom NordVPN Docker image for Unraid NAS systems

**Tech stack**: Docker, Ubuntu Noble, NordVPN, WireGuard/NordLynx, s6-overlay, Taskfile

**Current posture**: <read-mostly observability | controlled mutations | full CRUD | etc.>

---

## Architecture

<Replace this section with your actual data flow. Choose the pattern that fits your project:>

**Web app / BFF**:
```
Browser → API Routes → Domain Layer → External Services / Database
```

**API / backend service**:
```
Client → Route handlers → Service layer → Adapters → Database / External APIs
```

**CLI / scripting tool**:
```
CLI entry → Command layer → Core logic → File system / APIs
```

**Library / SDK**:
```
Public API surface → Implementation modules → Platform adapters
```

**Key rules** (replace with your own):
- <Constraint 1 — e.g. "no external calls from the UI layer">
- <Constraint 2>

See `docs/architecture.md` for the full architecture reference.

---

## Required Reading

Index of every important file in this project. `.ai/workflows/onboarding.md` decides what is
mandatory vs. conditional each session — do not treat this list as a per-session checklist.

### Core Product Docs
- `docs/project-rules.md` — product vision, boundaries, and governance
- `docs/architecture.md` — full architecture philosophy and design decisions
- `docs/tech-stack.md` — technology choices, rationale, and dependency versions
- `docs/testing.md` — testing strategy, framework config, and coverage expectations

### Core Rules
- `.ai/rules/engineering-rules.md` — implementation rules
- `.ai/rules/security-rules.md` — trust boundaries
- `.ai/rules/mutation-rules.md` — mutable feature approval

### Memory
- `.ai/memory/project-state.md` — current product posture
- `.ai/memory/architecture-decisions.md` — key architectural choices

### Workflows
- `.ai/workflows/onboarding.md` — getting started
- `.ai/workflows/implementation.md` — plan → code → test → validate
- `.ai/workflows/definition-of-done.md` — validation gates, Done + review checklists
- `.ai/workflows/session-close.md` — handoff & session close protocol
- `.ai/prompts/` — human-sent trigger prompts for Supervised and Autonomous modes.
  Read to understand what a human is invoking; do not treat as primary reading material.

### Tasks
- `.ai/current.md` — live handoff state
- `.ai/tasks/active.md` — what is in flight or queued next

### Version
- `.ai-prime-versions.json` — version cache; authoritative source is the `<!-- prime: ... -->` control section on line 1 of each generated file
- `manifest.json` — file registry with per-file template versions and `skipIfExists` flags (lives in the package, not your repo)

---

## Key Boundaries

### Product Posture

✅ **Approved**:
- <list approved operations, e.g. "read-only observability", "user CRUD", "order placement">

🚫 **Not approved** (unless separately approved with full governance):
- <list forbidden operations, e.g. "database admin", "infrastructure control", "AI-driven actions">

### Architecture Boundaries

✅ **Must**:
- <constraint 1 — e.g. "all writes use atomic tmp-then-rename" or "secrets stay server-side">
- <constraint 2 — e.g. "domain layer has no framework imports" or "no external calls from the UI layer">
- <constraint 3>

🚫 **Must not**:
- <forbidden pattern 1 — e.g. "client calls external APIs directly" or "write files outside targetDir">
- <forbidden pattern 2>
- Add mutations without approval gate

---

## Validation

### For Every Change
```bash
task docker-build    # Full static gate
```

For the full validation gates, Done checklist, and review checklist, see `.ai/workflows/definition-of-done.md`.

### Before Declaring Done
```bash
task docker-build    # Full static gate
task verify    # Runtime gate
```

---

## Working Rules

### Before Starting Any Work

These two steps are mandatory before any write action, without exception:

1. **Create a task branch** — `git checkout -b <type>/<name>` (`feature/`, `fix/`, `chore/`, `docs/`). This is always the first write action. Never work on `main` directly.
2. **For multi-step work: write a plan first** — create `.ai/plans/<name>.md` covering background, scope, phases, and execution order. Present it for human approval before implementing anything.

Do not skip either step, even for small tasks. The branch protects `main`; the plan ensures alignment before effort is spent.

### Use a Branch-Based Workflow
- **Never work on the `main` branch directly.**
- Always create and switch to a task-specific branch (`feature/<name>`, `fix/<name>`, `chore/<name>`) as the very first write action.
- **Obtain explicit human approval** before committing and pushing any changes.
- At session end, **obtain explicit human approval** to merge your task branch into `main`.

### Keep Changes Focused
- One logical change per commit
- Don't refactor unrelated code
- Don't skip validation

### Keep the Onboarding Path Current
- When work lands or priorities change, update `.ai/current.md` and `.ai/tasks/active.md`
- When architecture, key boundaries, tech stack, or validation commands change, update the corresponding sections of `AGENTS.md` in the same commit — it is the primary entry point and must not drift
- A new agent must learn current state from the standard path without hunting

---

## Quick Reference

### Commands
| Command | Purpose |
|---------|---------|
| `echo ok` | Install dependencies |
| `echo ok` | Dev server |
| `task docker-build` | Full static gate |
| `task verify` | Runtime gate |

### File Structure
```
<source>/             # Application source (e.g. src/, lib/, cmd/, <package_name>/)
docs/                 # Product documentation (comprehensive reference)
.ai/                  # Agent workspace (distilled working context)
```
