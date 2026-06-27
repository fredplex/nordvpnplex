# PRIME.md

> **You are an AI coding agent.** This document is written for you. Read it before touching
> anything else in this repository.

This file and `prime-ai-docs.mjs` are a two-file bootstrap bundle. It guides you through
running the scaffold script, filling in the generated placeholders, and operating correctly
within the resulting system for every session that follows.

Once priming is complete and the placeholders are filled in, this document is archived. From
that point forward, `AGENTS.md` and the `.ai/` workspace are your primary references — not
this file.

---

## First: Assess Your Situation

Before doing anything else, check the current state of the repository:

| What you find | Your situation | Where to go |
|---------------|---------------|-------------|
| No `.ai/` directory exists | Script has not been run yet | Continue to "Before You Start" |
| `.ai/` exists, files contain placeholder content | Script was run; fill-in not done | Skip to "Fill In These Sections" |
| `.ai/` exists but some expected files are missing | Partial setup | Run the script in add mode first (see "If setup is partial"), then skip to "Fill In These Sections" |
| `.ai/` and `docs/` exist with real project content | Setup is complete | This file should already be archived — follow `AGENTS.md` and `.ai/prompts/onboarding-prompt.md` instead |

The rest of this document is ordered for the common path (no `.ai/` yet). Skip sections that do not apply to your situation.

---

## Before You Start

**1. Check Node.js is available**

```bash
node --version   # must be v18 or higher
```

**2. Do NOT run this on `main` or `master`**

Create a branch first — the script will warn you if you forget, but do it now:

```bash
git checkout -b chore/prime-ai-docs
```

**3. Know what the script will ask**

If running in interactive mode, the script prompts for seven values. Have these ready:

| Prompt | What to provide |
|--------|----------------|
| **Project name** | The repo or product name. Defaults to `package.json` name or directory name. |
| **One-line description** | A single sentence: what this project does and for whom. |
| **Tech stack** | Comma-separated key technologies: `Next.js, TypeScript, Postgres` etc. |
| **Install command** | How to install dependencies: `npm ci`, `pnpm install`, etc. |
| **Dev server command** | How to start local development: `npm run dev`, `python manage.py runserver`, etc. |
| **Static validation gate** | The command that runs type-check + lint + unit tests + build. |
| **Runtime / E2E test command** | The command that runs integration or E2E tests against a running server. |

These values appear throughout the generated files. Accurate values save rework.

---

## Run the Script

### Option A — Interactive (recommended)

```bash
node prime-ai-docs.mjs
```

The script will prompt for each value, show defaults where it can detect them, and let you
confirm before writing anything.

### Option B — Preview first with dry run

```bash
node prime-ai-docs.mjs --dry-run
```

Shows exactly what would be created or skipped without writing any files. Run this first if
you're unsure whether files already exist.

### Option C — View help and flag details

```bash
node prime-ai-docs.mjs --help
# Or:
node prime-ai-docs.mjs -h
```

Prints the help menu listing all available positional arguments, options, headless flags, and usage examples.

### Option D — Headless (CI or when values are known)

```bash
node prime-ai-docs.mjs --yes \
  --name "My App" \
  --description "A platform for X" \
  --stack "Next.js, TypeScript, Postgres" \
  --install "npm ci" \
  --dev "npm run dev" \
  --validate "npm run validate:local" \
  --test "npm run test:e2e"
```

### If setup is partial (add mode)

The script auto-detects add mode when `.ai/` already exists. It creates only the missing files
and skips everything that already exists — your customized content is never touched.

To see what's missing before writing anything:

```bash
node prime-ai-docs.mjs --dry-run
```

Then run without `--dry-run` to create the missing files.

### If context values need to be corrected

If the script ran with wrong values (wrong project name, wrong commands), regenerate all files
cleanly with `--overwrite --yes` and corrected flags:

```bash
node prime-ai-docs.mjs --overwrite --yes \
  --name "Correct Name" \
  --description "Correct description" \
  --stack "..." \
  --install "..." \
  --dev "..." \
  --validate "..." \
  --test "..."
```

### If you are updating templates (re-prime)

When a newer version of `prime-ai-docs.mjs` has improved templates:

1. Preview what would change: `node prime-ai-docs.mjs --dry-run`
   The script compares each file's deployed version (from `.ai-prime-versions.json`) against
   the current template versions and shows `would-update`, `Up to date`, or `would-create`
   for each file.
2. Run the script normally — smart update is the default for existing repos:
   `node prime-ai-docs.mjs --yes --name "..." ...`
   Only files with template improvements are backed up and replaced. Files that are already
   current are untouched.
3. Merge your project-specific content from the backup into the updated files.
   Follow the merge protocol below — do not skip this step.
4. Add `.ai-prime-backup/` to your `.gitignore`.

> **Force-overwrite all files**: if context values changed (e.g., project name) or you want
> to regenerate everything regardless of version, use `--overwrite` instead.

#### Merging backup content into new templates

**Principle**: the new file's structure wins. Never copy an old file wholesale. Extract only
the human-authored content from the backup and place it into the equivalent sections of the
new file.

**What to carry over** — content a human wrote for this project that the script cannot
regenerate:
- Architecture diagrams and data flow descriptions
- Key Boundaries — the actual ✅ Approved / 🚫 Not approved lists for this project
- Currently Approved mutations in `mutation-rules.md`
- Product identity, operational phase, approved scope in `project-state.md`
- Real tech versions, rationale, and key decisions
- Actual feature inventory and testing strategy specifics

**What NOT to carry over** from the backup:
- Section headers and subheadings (use the new file's versions)
- Guidance comments, HTML comments, italicised prompts ("Fill in your...")
- Template boilerplate text that the new version has improved
- Any text still containing placeholder markers (`<your content>`, `TODO`, `[Fill in...]`)

**Merge order** (highest-value first):
1. `AGENTS.md` → Architecture section + Key Boundaries
2. `.ai/rules/mutation-rules.md` → Currently Approved section
3. `.ai/memory/project-state.md`
4. `.ai/memory/architecture-decisions.md`
5. `docs/architecture.md`
6. `docs/project-rules.md`
7. `docs/tech-stack.md`
8. `docs/feature-state.md`
9. `docs/testing.md`
10. All other files in the backup — check each for project-specific additions

**Per-file steps**:
1. Read the **new** file first — understand its current structure and which sections are
   still placeholders.
2. Read the **backup** file (`.ai-prime-backup/{timestamp}/{relPath}`) — identify
   project-specific content in each section.
3. For each placeholder or empty section in the new file: if the backup has real content
   for the equivalent section, copy that content in. Copy the content only — not the
   surrounding headers or guidance text from the backup.
4. Leave all structural improvements in the new file intact. If the new file has a section
   absent from the backup, keep the new version as-is.
5. After merging: scan for any remaining placeholder markers. Flag them — do not leave
   silent gaps.

**Structural integrity check** after each file:
- All section headings from the new file are present and unchanged
- No guidance comments or fill-in prompts from the backup were reintroduced
- No placeholder markers remain where backup content was available

**Files that need no merge**: files absent from the backup were created fresh during the
overwrite run. They contain only template defaults and are handled the same way as a
first-prime setup — fill them in using the priority order in "Fill In These Sections."

### Expected output

```
🚀  AI Docs Primer — Initializing new repo
    Target: /path/to/project

✅  AI Agent Docs — prime complete

  Created (25):
    ✅  CLAUDE.md
    ✅  AGENTS.md
    ✅  .ai/README.md
    ...

  Next steps:
    1. Open AGENTS.md and fill in the Architecture section
    ...
```

---

## What Was Just Created

The script generates 28 files across three locations: `.ai-prime-version`, `.ai-prime-versions.json`, `CLAUDE.md`, and
`AGENTS.md` at the repo root, 18 files inside `.ai/`, and 6 files inside `docs/`. Here is
what each one is, what belongs inside it, when to update it, and what breaks if you misuse it.

---

### `.ai-prime-version` — Template Version Record

**Purpose**: Records the version of vibe-coding-template used to generate this project's AI
agent system. Always overwritten on every script run — never needs merging, never goes stale.

**When to update**: Never manually. The script maintains it automatically.

**How to check if a newer template version is available**: run `node prime-ai-docs.mjs --version`
in the project that has the script. Compare against the version in this file.

---

### `.ai-prime-versions.json` — Per-File Version Record

**Purpose**: Records the template version at which each generated file was last written.
Used by the script's smart update mode to determine which files have improved templates
available without requiring a full overwrite.

**Key properties**:
- Committed (not gitignored) — must be checked in so it survives clones and CI
- Always overwritten on every non-dry-run — always reflects the current deployed state
- Never edit manually

**When to update**: Never manually. Updated automatically on every script run.

---

### `CLAUDE.md` — Claude Code Session Bootstrap

**Purpose**: Automatically loaded by Claude Code at the start of every session — before the
agent reads anything else. It bootstraps the session by pointing to `AGENTS.md` and showing
the session start protocol and quick commands.

**When to update**: When commands change (the script regenerates them from context values), or
when the session start protocol changes. Do not add project-specific architecture or rules
here — those belong in `AGENTS.md` and the `.ai/` workspace.

**Note for non-Claude Code users**: If the project uses a different AI coding tool, this file
is inert. Cursor reads `.cursor/rules/`, Windsurf reads `.windsurfrules/` — check the tool's
docs for its equivalent bootstrap file.

---

### `AGENTS.md` — The Entry Point

**Purpose**: The single file every agent reads first at the start of every session. Think of
it as the lobby: it orients, links, and hard-limits without being exhaustive.

**Internal structure**:
```
AGENTS.md
├── Quick Start        Commands to run the project
├── Project Context    What the app does, tech stack, current posture
├── Architecture       Your data flow diagram + key constraints
├── Required Reading   Index of every important .ai/ file by category
├── Key Boundaries     ✅ Approved / 🚫 Not approved (product + architecture)
├── Validation         Gates to run before declaring any task done
├── Working Rules      Branch discipline, approval requirements, focus rules
└── Quick Reference    Commands table, file structure
```

**When to update**: When the tech stack changes, when new `.ai/` files are added to Required
Reading, or when the product's approved boundaries change.

**Critical**: The Architecture section ships as a placeholder with pattern examples. **A human
must fill this in before the first development session.** An agent working from an unfilled
Architecture section will make wrong assumptions about the codebase structure.

---

### `.ai/` — The Agent Workspace

The `.ai/` folder is your operational context. You own it — read it, write it, extend it.
It is not a read-only reference. Every session should leave it more accurate than it was.

---

### `.ai/README.md` — Workspace Orientation

**Purpose**: Orients an agent to the `.ai/` folder itself — what's here and why. Not the
entry point (that's `AGENTS.md`).

**When to update**: When you add a new subfolder to `.ai/`.

**Note**: Unlike the other generated files, `.ai/README.md` is pre-written to describe the
workspace structure. Update the "What is this app?" section to reflect the real project
after priming.

---

### `.ai/current.md` — The Most Important File

**Purpose**: Live handoff state between sessions. Every session reads this immediately after
`AGENTS.md`. An agent reading it cold must know in 2 minutes: what was done, why, what's
next, and what will break if touched carelessly.

**Internal structure** (newest content at the top):
```
## Active Initiative — [name or "None"]
  Status: what's in progress right now
  Proposed / awaiting approval: ideas not yet started
  Recently shipped: last 2-4 items with commit hashes
  Next step: exact quote of what to pick up next

## Session Handoff — YYYY-MM-DD (task name)
  What was just completed: table of commit → change
  Stopping point: branch, working tree state, validation results
  Decisions / reasoning: why X was chosen over Y
  Fragile areas: what to watch, what breaks easily
```

**When to update**: At the close of every session — prepend a new Session Handoff block.
Never delete old blocks; they are the project's decision log.

**Common mistake**: Agents sometimes update only `tasks/active.md` and skip `current.md`. Do
both. `current.md` is what a new agent reads first.

---

### `.ai/SESSION_NOTES.md` — Session Close Log

**Purpose**: Append-only audit trail of every session close. Provides context on decisions,
unexpected findings, and known debt across sessions.

**Internal structure**:
```
## Session Close — YYYY-MM-DD (task name)
  Completed this session: numbered table of items
  Key decisions: why X was chosen over Y
  Known follow-ups / technical debt
  Fragile areas
  Validation results
  Memory / docs sync notes
```

**When to update**: Prepend a new block at every session close.

**Rule**: During onboarding, read only the most recent entry. Never read the full history
unless specifically debugging a past decision.

---

### `.ai/memory/` — Stable Facts

Files in this folder contain durable, reusable facts about the codebase that every agent
should know. These are not task-specific — they're the permanent knowledge layer.

**Add a file when**: you discover a non-obvious fact, a source-of-truth correction, a durable
constraint, or an architectural decision that future agents need.

**Do not add**: transient state, raw logs, task-specific notes, or anything derivable from
reading the source or `git log`.

---

#### `.ai/memory/project-state.md`

**Purpose**: Current product posture — what's built, what's approved, what's forbidden.

**Internal structure**:
```
Product Identity: name, description, stack, product feel, anti-definition
Current Operational Phase: MVP / controlled mutations / v2 migration / etc.
Implemented Features: key areas (details in docs/feature-state.md)
Approved Mutable Scope: every currently approved state-changing operation
All Mutable Actions Must Be: server-side, authenticated, confirmed, audited, non-optimistic
Forbidden Unless Separately Approved: operations requiring governance before implementation
Architecture Posture: 2-3 key principles
Testing: unit/E2E framework, location, CI pipeline
```

**When to update**: When the product posture changes — new features ship, scope is approved
or revoked, phase transitions.

**Common mistake**: Letting this fall behind `docs/feature-state.md`. They must stay in sync.
If they disagree, report the mismatch — don't guess.

---

#### `.ai/memory/architecture-decisions.md`

**Purpose**: Key architectural choices with rationale — the "why" behind how the codebase is
structured.

**Internal structure**:
```
Data Flow: diagram of how data moves through the system
Layer Discipline: which layers can import which
State Management: client-side state approach
Auth Model: session/JWT/API key approach
Caching Strategy: TTLs, invalidation
Key Decisions: each as Choice / Rationale / Gotcha
Gotchas: non-obvious things that surprise new developers
```

**When to update**: When a significant architectural decision is made or reversed.

**Common mistake**: Writing what the architecture does rather than why it was chosen. Future
agents need the rationale, not just the diagram.

---

### `.ai/rules/` — Implementation Rules

Rules you must follow when writing code. The `paths:` frontmatter in some files scopes them
to specific globs — load only the rules relevant to the files you're working in.

**The scoping mechanism**:
```yaml
---
paths:
  - "src/**"
---
```
Update the paths to match your actual source layout (e.g., `src/api/**`, `lib/**`, `cmd/**`).
Files without `paths:` frontmatter load unconditionally.

---

#### `.ai/rules/engineering-rules.md`

**Purpose**: Universal implementation rules — layer boundaries, naming conventions, mutation
discipline, commit hygiene, and archetype-specific engineering standards.

**Notable sections**:
- **Web UI / BFF** — layer rules, test-ID convention, browser verification requirement
- **API / Backend Service** — service boundary rules, versioning, idempotency
- **CLI / Library / SDK** — interface stability, error contracts, output format rules
- **Shared Standards** — commit discipline and naming conventions that apply to all archetypes

Each section is labelled "Delete if N/A." Remove the sections that do not apply to this
project and keep only the ones that match the actual archetype.

**When to update**: When a new universal rule is established for this codebase.

---

#### `.ai/rules/security-rules.md`

**Purpose**: Trust boundaries and security enforcement rules. Loaded unconditionally (no path
scope).

**Notable sections**:
- **Client-Server / Web API** — browser trust model, server-side enforcement, what must never
  reach the browser, CSRF handling
- **Local Script / CLI** — input validation, path safety, environment variable exposure

Each section is labelled "Delete if N/A." Keep only the section that matches this project's
execution model. A CLI or library that never touches a browser can safely delete the
client-server section.

**When to update**: When the auth model, trust boundary, or execution environment changes.

---

#### `.ai/rules/mutation-rules.md`

**Purpose**: The mutation approval model and required protections. Scoped to mutable source
paths via `paths:` frontmatter.

**Internal structure**:
```
Core Principle: read-only is the default; mutations are exceptions
Mutation Taxonomy (Web/Database): Safe Read / Soft Control / Dangerous Write / Deferred
Mutation Taxonomy (Local/CLI): Read / Transform / Write-Delete / Deferred
Currently Approved: the explicit list of approved mutations (fill this in)
Required Protections (Web/Database): server-side auth, CSRF, idempotency, audit, etc.
Required Protections (Local/CLI): path validation, confirmation, atomic writes, etc.
```

**The `paths:` frontmatter** scopes these rules to your mutable-code directory. The template
generates:
```yaml
paths:
  - "src/**"
```
Update this to match your actual source layout (e.g., `src/api/**`, `lib/**`, `cmd/**`).

**Critical**: The "Currently Approved" section ships empty. **Fill this in before any
mutation-adjacent work begins.** An agent that doesn't see an explicit approval list will not
know what it can and cannot implement.

The taxonomy and required protections sections each have two archetype variants — delete the
one that does not apply to this project.

**When to update**: When a mutation is approved or revoked.

---

### `.ai/workflows/` — How To Work

Repeatable step-by-step procedures for common tasks. One workflow per file. Do not let
workflows become catch-all documents.

---

#### `.ai/workflows/onboarding.md`

**Purpose**: The reading order, scope filter, report-back format, and branch creation process
for starting a new session.

**Key rules from this file**:
- Read in the prescribed order — not ad hoc
- Apply the scope filter: always read the core path; read task-specific files for the work at
  hand; treat archives as historical unless explicitly pointed there
- Report back before writing any code: Current State / Next Task / Ambiguity / Fragile Areas
- First write action = `git checkout -b <type>/<name>`

---

#### `.ai/workflows/implementation.md`

**Purpose**: The Plan → Code → Test → Validate cycle, plus the intermediate phase commit
protocol and the session close protocol.

**Key protocols**:

*Intermediate phase commit*: preflight scope check → focused validation → clean dev artifacts
→ mark phase complete → stage only phase files → present commit for human approval → commit
and push.

*Session close*: run full validation gate → revert dev artifacts → update `current.md` and
`SESSION_NOTES.md` → update `tasks/active.md` → memory check → sync `docs/` if behaviour
changed → present merge for human approval → merge and push.

---

#### `.ai/workflows/validation.md`

**Purpose**: The two validation gates and change-type validation chains.

**Gate 1 — Static** (always run first):
```bash
<your validate command>
```

**Gate 2 — Runtime** (run for UI, route, mutation, and auth changes):
```bash
<your test command>
```

**Change-type chains**: narrower test sets to run while working (before full gates at
completion). See this file for the per-change-type chains.

---

#### `.ai/workflows/review.md`

**Purpose**: Code review checklist — run through this before approving or presenting any
commit for approval.

**Checklist covers**: layer boundaries, security, test coverage, UI element test IDs, commit
hygiene, mutation-specific requirements, mock data consistency, UX copy tone.

---

### `.ai/tasks/` — Task Tracking

---

#### `.ai/tasks/active.md`

**Purpose**: The live task queue. Updated as work progresses. The onboarding path terminates
here — an agent reading `AGENTS.md → .ai/current.md → .ai/tasks/active.md` must know exactly
what to do next without hunting anywhere else.

**Internal structure**:
```
## Current Status
  Active: [task name] or "None"
  Start here: [one-liner on where to begin — this is the contract]

## Blocked Candidates
  [Tasks that cannot start yet, each with the specific blocker named]

## Ready Follow-Ups
  [Tasks ready to plan or implement next, each with a goal statement]

## Recently Completed
  [Last 4-6 items with commit hashes]
```

**When to update**: At every session — check off completed work, update the "Active" and
"Start here" lines, move completed tasks to `completed.md`.

**Common mistake**: Leaving "Start here" pointing to completed work. The next agent will
spend time on something already done.

---

#### `.ai/tasks/completed.md`

**Purpose**: Archive of finished tasks with commit hashes. Append only — never delete entries.

---

### `.ai/prompts/` — Reusable Agent Prompts

These three files are the forcing functions that drive consistent agent behaviour across
session types. Without them, agents tend to skip steps, read fewer files, or commit without
asking.

**How to use**: copy the contents of the relevant file and paste it as your session-opening
message.

---

#### `.ai/prompts/onboarding-prompt.md`

**When to use**: Start of every new agent session.

**What it drives**: the read-only onboarding pass, the prescribed reading order and scope
filter, the report-back format, the requirement that no files are modified until the report is
confirmed.

---

#### `.ai/prompts/intermediate-phase-prompt.md`

**When to use**: Between phases of a multi-step implementation plan.

**What it drives**: preflight scope check, phase confirmation, focused implementation only
(no scope creep), focused validation, tracking and docs update, human approval before commit.

---

#### `.ai/prompts/session-close-prompt.md`

**When to use**: End of every session.

**What it drives**: full validation gate, dev artifact cleanup, `current.md` and
`SESSION_NOTES.md` updates, task tracking updates, memory check, `docs/` sync, human approval
before merge to `main`.

---

### On-Demand Folders

These folders are not generated by the script. Create them when the first item in each
category arises.

#### `.ai/plans/`

Detailed, phased implementation plans for multi-step work. Create a plan before coding starts
for any task that spans more than one logical commit. Use the standard format:

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

Move completed plans to `.ai/plans/archive/`. Do not delete them — they are the project's
decision record.

#### `.ai/assessments/`

Pre-implementation analysis written before a plan exists. Use when a change is needed but
the implementation approach isn't clear yet. Structure: Problem / Root Cause Analysis /
Recommendations / What NOT To Do.

#### `.ai/debug/`

Structured investigation reports for non-obvious bugs. Use when investigation takes meaningful
research — not for simple fixes. Structure: Symptoms / Code Review Findings / Root Cause /
Fix. Move to `debug/archive/` when resolved.

#### `.ai/integrations/`

Quick-reference notes on external APIs and services. One file per integration. Not full API
docs — link to those. Cover: auth model, key endpoints, timeout behaviour, quirks, error
categories.

#### `.ai/knowledge/`

Condensed one-page reference cards on topics that come up repeatedly. If a file grows long,
it belongs in `docs/` instead.

---

### `docs/` — Comprehensive Reference

The `docs/` folder is the full authoritative reference. The `.ai/` files are the distilled
working subset. Every major topic has an entry in both, cross-referenced.

| Topic | `.ai/` working copy | `docs/` full reference |
|-------|---------------------|------------------------|
| Architecture | `.ai/memory/architecture-decisions.md` | `docs/architecture.md` |
| Features | `.ai/memory/project-state.md` | `docs/feature-state.md` |
| Rules | `.ai/rules/*.md` | `docs/project-rules.md` |
| Testing | `.ai/workflows/validation.md` | `docs/testing.md` |

**Rule**: when behaviour changes, update both the `.ai/` working copy and the `docs/` full
reference. Never update just one.

#### `docs/README.md`

Navigation hub for the `docs/` folder. Contains the cross-reference table and links to all
doc files.

#### `docs/architecture.md`

Full architecture description. Ships as a stub — **fill this in before any
architecture-sensitive work begins.** Covers: data flow, layer responsibilities, layer
discipline, key decisions with rationale, caching, auth, real-time, logging, gotchas.

#### `docs/project-rules.md`

Product vision, what's in scope, what's out of scope, approved mutations, UX principles,
governance process for new features. Ships as a stub — fill in before work begins.

#### `docs/feature-state.md`

Authoritative inventory of all features: Implemented ✅ / In Progress 🚧 / Planned 📋 /
Deferred ❌. Update when features ship or status changes.

#### `docs/tech-stack.md`

Technology choices, rationale, and dependency versions. Ships as a stub — fill in with actual
versions.

#### `docs/testing.md`

Testing strategy, framework configuration, and coverage expectations. Ships partially filled
from the `validate` and `test` commands provided during priming.

---

## Fill In These Sections — Priority Order

Before the first real development session, a human must review and fill in these sections.
You (the agent) can draft the content for human review, but do not start development work
until a human has confirmed each one.

**Step 0 — Survey the existing project first (skip for brand-new repos)**

If this is a mature repo with existing source code, read the project before drafting any
content:
- `package.json` — project name, scripts, dependencies
- Directory structure — where source lives, what layers exist
- Any CI config (`.github/workflows/`, `Makefile`, etc.)
- Any existing architecture docs or READMEs

Draft fill-in content from what you observe, not from guesses.

1. **`AGENTS.md` → Architecture** — replace the pattern examples with the actual data flow
   diagram and real constraints for this project
2. **`AGENTS.md` → Project Context → Current posture** — replace the placeholder
3. **`AGENTS.md` → Key Boundaries** — fill in the ✅ Approved and 🚫 Not approved lists
4. **`.ai/memory/project-state.md`** — Product Identity, Operational Phase, Approved Mutable
   Scope, Forbidden scope
5. **`.ai/rules/mutation-rules.md` → Currently Approved** — list every approved mutation
   explicitly; anything not listed is forbidden
6. **`docs/architecture.md`** — full architecture description with layer responsibilities
7. **`docs/project-rules.md`** — product vision and what's explicitly out of scope
8. **`docs/tech-stack.md`** — real technology versions

---

## The Session Lifecycle

Every session follows this three-phase pattern. Do not skip phases or reverse their order.

### Phase 1 — Onboard (read-only)

1. Read `AGENTS.md` → `.ai/current.md` → `.ai/tasks/active.md` → `.ai/SESSION_NOTES.md`
   (last entry only)
2. Read task-specific files: active plan, relevant rules, relevant docs
3. Report back with: Current State / Next Task / Ambiguity / Fragile Areas
4. **Wait for human confirmation.** Do not write anything before this.
5. Once confirmed: `git checkout -b <type>/<name>` — this is always the first write action

### Phase 2 — Implement

**Multi-step work** (write a plan first):
- Write `.ai/plans/<name>.md` → present for human approval → implement phase by phase
- Each phase: implement → focused validation → present commit for human approval → commit + push

**Single-step work**:
- Implement → validate → present commit for human approval → commit + push

### Phase 3 — Close

1. Run full validation gate (Gate 1 + Gate 2 for runtime-affecting changes)
2. Revert any dev-environment artifacts (generated type files, build outputs in src)
3. Update `.ai/current.md` — prepend new Session Handoff block
4. Prepend new entry to `.ai/SESSION_NOTES.md`
5. Update `.ai/tasks/active.md` — check off completed items
6. Memory check: did this session reveal durable codebase facts? If yes, update `.ai/memory/`
7. Sync `docs/` if any behaviour, API, or architecture changed
8. **Present merge sequence for human approval.** Do not merge or push before this.
9. Once approved: merge task branch to `main`, push, delete task branch

---

## The Three Approval Gates

There are exactly three mandatory human approval gates. Never proceed past one without
explicit human confirmation.

**Gate 1 — Before any code is written**

The agent reports its onboarding findings. The human confirms the report is accurate and
assigns the next task. Only after this confirmation does the agent create a task branch and
begin work.

**Gate 2 — Before committing and pushing**

The agent presents the proposed commit message and push command. The human reviews and
approves. Only then does the agent execute the commit and push.

**Gate 3 — Before merging to main**

The agent presents the full merge + push sequence (checkout main → pull → merge task branch
→ push → delete task branch). The human reviews and approves. Only then does the agent
execute.

These gates prevent agents from autonomously changing `main`, shipping broken code, or going
off-scope without the human knowing.

---

## Ongoing Rules

Follow these in every session, without exception:

- **Never work on `main` directly.** Always create a task branch first.
- **Never commit or push without explicit human approval** at Gate 2.
- **Never merge to `main` without explicit human approval** at Gate 3.
- **Update `.ai/current.md` at every session close.** A session that closes without updating
  `current.md` has not properly closed.
- **When behaviour changes, update both layers.** `.ai/` working copy and `docs/` full
  reference must stay in sync. Update both in the same session, not in a follow-up.
- **Keep the "Start here" line current.** The line in `.ai/tasks/active.md` must always point
  to the real next action. A new agent must never be lost following this path.
- **Memory files are facts, not logs.** `.ai/memory/` is for durable, reusable codebase
  knowledge. Task state, transient hypotheses, and raw output do not belong there.
- **Source code is always truth.** If any document disagrees with the source, report the
  mismatch. Do not guess which is correct.

---

## What NOT to Put in `.ai/`

- Raw logs, stack traces, or command output
- Secrets, credentials, or API keys
- In-progress thoughts or unresolved hypotheses
- Code snippets that belong in source files
- PR descriptions or changelogs (they belong in git)
- Full product specs, roadmaps, or migration guides (they belong in `docs/`)
- Anything derivable by reading the current source code or `git log`

---

## After Priming Is Complete

Once all placeholder sections are filled in and a human has reviewed them:

1. Move this file (`PRIME.md`) to `.ai/knowledge/prime-reference.md` or delete it — it has
   served its purpose
2. Your primary references from here on are: `AGENTS.md`, `.ai/current.md`, and the
   `.ai/tasks/active.md` onboarding path
3. **Claude Code users**: `CLAUDE.md` at the repo root is loaded automatically at every
   session start — it will point you to `AGENTS.md` and the session protocol without any
   manual prompt
4. **All other tools**: start your first real session by pasting the contents of
   `.ai/prompts/onboarding-prompt.md` as your opening message

---

*Generated by `prime-ai-docs.mjs` — [vibe-coding-template](https://github.com/fredplex/vibe-coding-template)*
