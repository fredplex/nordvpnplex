<!-- prime: version=3.0.0 template=.ai/README.md date=2026-06-30 -->
# Agent Workspace

Welcome to the `.ai/` directory — the operational context for working on **nordvpnplex**.

---

## Quick Orientation

**What is this app?**
- NordVPN container — custom Docker image packaging the official NordVPN Linux client as a VPN gateway on Unraid NAS systems
- **Stack**: Docker, Ubuntu Noble (linuxserver.io base), NordVPN Linux client, WireGuard/NordLynx, s6-overlay, Taskfile, GitHub Actions

**Current phase**: Stable maintenance — update NordVPN client version as new packages release, verify locally, publish via `task release`. Base image refresh is automated monthly.

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
- **`implementation.md`** — the Plan → Code → Test → Validate cycle and phase commit protocol (Supervised / Autonomous modes).
- **`definition-of-done.md`** — the validation gates (static + runtime), the Done checklist, and the review checklist.
- **`session-close.md`** — the handoff & session close protocol (gates, handoff docs, memory, merge).

_When to update_: when validation commands change; when checklist items are added or revised.

### `/tasks/` — Task Tracking
Track work here. Update `active.md` as you work; move completed items to `completed.md`.

### `/plans/` — Implementation Plans
Detailed work plans for approved initiatives. Create a plan before starting multi-step work.

### `/prompts/` — Reusable Agent Prompts
Copy-paste prompts for starting a session, executing plan phases, and closing a session.

- **`onboarding-prompt.md`** — paste as opening message to start a new agent session
- **`intermediate-phase-prompt.md`** — Supervised mode: execute one phase with human approval before commit
- **`execute-plan-prompt.md`** — Autonomous mode: execute all phases with commits per phase; human approves push
- **`session-close-prompt.md`** — trigger the handoff and session-close protocol

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
