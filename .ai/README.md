# Agent Workspace

Welcome to the `.ai/` directory — the operational context for working on **nordvpn**.

---

## Quick Orientation

**What is this app?**
- Nordvpn Container


**Current phase**: <describe current development phase>

---

## Directory Structure

**You own this workspace.** Read what's here, add to it when you learn something, and create new files when a category doesn't exist yet.

### `/memory/` — Stable Facts
Foundational knowledge about this codebase. Read before making significant changes; write when you learn something new.

### `/rules/` — Implementation Rules
Rules you must follow when writing code. Use `paths:` frontmatter to scope rules to specific file globs.

### `/workflows/` — How To Work
Repeatable procedures for common tasks (onboarding, implementation, validation, review, debugging).

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

## Keep `AGENTS.md` in Sync

The **Required Reading** section in `AGENTS.md` indexes every important `.ai/` file. When you add a new file, add it to that list — otherwise agents won't discover it.

---

## Product Documentation

Full product specs, architecture reference, and design decisions live in `docs/`:
- `docs/project-rules.md` — product vision and boundaries
- `docs/architecture.md` — architecture philosophy
- `docs/feature-state.md` — authoritative feature inventory
- `docs/testing.md` — testing strategy
