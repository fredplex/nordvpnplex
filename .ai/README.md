# Agent Workspace

Welcome to the `.ai/` directory — the operational context for working on **nordvpn**.

---

## Quick Orientation

**What is this app?**
- NordVPN Container


**Current phase**: Stable maintenance — update NordVPN client version as new packages release, verify locally, publish via `task release`

---

## Directory Structure

**You own this workspace.** Read what's here, add to it when you learn something, and create new files when a category doesn't exist yet.

### `/memory/` — Stable Facts
Foundational knowledge about this codebase. Read before making significant changes; write when you learn something new.

### `/rules/` — Implementation Rules
Rules you must follow when writing code. Use `paths:` frontmatter to scope rules to specific file globs.

- **`engineering-rules.md`** — layer boundaries, naming conventions, mutation discipline, commit hygiene. Has per-archetype sections (Web, API, CLI); delete the ones that don't apply to this project.
- **`security-rules.md`** — trust boundaries and security enforcement. Has per-archetype sections; keep only the one that matches this project's execution model.
- **`mutation-rules.md`** — mutation taxonomy, approval model, and required protections. The `Currently Approved` section is the live list — update it whenever a mutation is approved or revoked.

_When to update_: when a new rule is established; when the Currently Approved list changes.

### `/workflows/` — How To Work
Repeatable procedures for common tasks. One workflow per file — do not let them become catch-all documents.

- **`onboarding.md`** — prescribed reading order, scope filter, and report-back format for starting a session.
- **`implementation.md`** — the Plan → Code → Test → Validate cycle; intermediate phase commit protocol; session close protocol.
- **`validation.md`** — the two validation gates (static and runtime) and per-change-type test chains.
- **`review.md`** — pre-commit checklist covering layer boundaries, security, tests, commit hygiene, and mutation requirements.

_When to update_: when validation commands change; when checklist items are added or revised.

### `/tasks/` — Task Tracking
Track work here. Update `active.md` as you work; move completed items to `completed.md`.

### `/plans/` — Implementation Plans
Detailed work plans for approved initiatives. Create a plan before starting multi-step work.

### `/prompts/` — Reusable Agent Prompts
Copy-paste prompts for onboarding, intermediate phases, and session close.

### `/integrations/` — Integration Notes
Quick-ref notes on external systems. Full specs in `docs/integrations/`.

### `/assessments/` — Pre-Implementation Analysis
Analysis of UX gaps and feature problems before implementation begins.

### `/debug/` — Debugging Investigations
Investigation reports and diagnostic findings. Archive when resolved.

### `/knowledge/` — Quick Reference Cards
Condensed one-page references. If it grows long, it belongs in `docs/` instead.

---

## Conventions

### Plan format

Every plan in `/plans/` uses the same structure:

```
# [Feature / Task Name]
Created: YYYY-MM-DD | Status: Pending review / In progress / Complete

## Background — why this is needed
## Scope — what's in / what's explicitly out
## Changes — phase by phase with file paths and descriptions
## Execution Order — step table with commit prefixes
## Validation — what must pass before complete
## Open Questions
```

### Archive pattern

When work is done, move the plan to `/plans/archive/` — never delete. The same applies to debug investigations (`/debug/archive/`) and assessments. Archived files are the project's decision record.

### When to create each on-demand folder

| Folder | Create when |
|--------|-------------|
| `/plans/` | First multi-step task — before coding starts |
| `/assessments/` | A change is needed but the approach isn't clear yet |
| `/debug/` | A bug requires meaningful investigation, not a quick fix |
| `/integrations/` | First external API or service is integrated |
| `/knowledge/` | A topic comes up repeatedly and needs a condensed reference |

---

## Keep `AGENTS.md` in Sync

The **Required Reading** section in `AGENTS.md` indexes every important `.ai/` file. When you add a new file, add it to that list — otherwise agents won't discover it.

---

## Product Documentation

Full product specs, architecture reference, and design decisions live in `docs/`:
- `docs/project-rules.md` — product vision and boundaries
- `docs/architecture.md` — architecture philosophy
- `docs/feature-state.md` — authoritative feature inventory
- `docs/testing.md` — testing strategy
