<!-- prime: version=3.5.3 template=.ai/GUIDE.md date=2026-07-17 -->
# AI Workspace Guide

> **You are an AI coding agent.** This file is written for you. Read it when setting up
> this workspace for the first time, or when merging a template update.

This file lives at `.ai/GUIDE.md` and is versioned like any other template file. When a
newer version of the guide is available, the script will update it and back up your copy to
`.ai-prime-backup/{timestamp}/` — merge any project-specific notes back in after the update.

Once setup is complete, your primary references are `AGENTS.md` and the `.ai/` workspace —
not this file. Return here only when running the script again or merging a template update.

---

## Part 1 — Running the Script

### Agent execution steps

> **An agent reaches these steps only when `.ai/GUIDE.md` already exists on disk — i.e., on a
> re-prime.** The very first prime is a human-run command (`npx github:fredplex/vibe-coding-template .`);
> the script creates this guide as part of that run.

> **You are executing a re-priming operation.** Follow Steps 1–7 in order.
> Do not skip steps. Do not proceed from memory. Every decision — flag values, scenario
> classification, branching, script run, backup merge, commit, report-back — is defined here.

---

#### Step 1 — Check saved context, then discover only what's missing

**First, check what the script already has on record.** Run:

```bash
npx github:fredplex/vibe-coding-template . --status
```

Read the `Recorded Context` block. Any field shown there was saved from a previous run and
will be **reused automatically** if you omit its flag entirely — you do not need to
rediscover it, and you should not pass a flag for it unless the human has told you the
recorded value is wrong or the project has genuinely changed. Passing a flag always
overrides the saved value, including for future runs, so only do it deliberately.

**For any field `--status` shows as `(none)`, or that the human says is wrong**, discover it:

Read the following files in this repository (if they exist):
- `package.json` — extract: `name`, `description`, `scripts.validate` (or similar),
  `scripts.test` (or similar), `scripts.dev`, `scripts.start`
- Root `README.md` — extract: project description, tech stack if mentioned
- Any lockfile present (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`)
  to detect the package manager

| Flag | Where to find it |
|------|-----------------|
| `--name` | `package.json` → `name`, else directory name |
| `--description` | `package.json` → `description`, else infer from README first line |
| `--stack` | README or `package.json` `dependencies` keys — list key technologies |
| `--install` | Lockfile → `npm ci` / `pnpm install` / `yarn install` / `bun install` |
| `--dev` | `package.json` → `scripts.dev` or `scripts.start` |
| `--validate` | `package.json` → `scripts.validate`, `scripts.lint`, `scripts.typecheck`, or `scripts.check` |
| `--test` | `package.json` → `scripts.test`, `scripts.test:e2e`, `scripts.test:integration` |

Use `echo ok` **only** for commands that genuinely do not exist yet in the project.
Do not guess or invent commands. If `package.json` does not exist, use the directory
name for `--name` and `echo ok` for all command flags. If `--status` reports no recorded
context at all (first-ever prime, or a repo primed before this feature existed), discover
all seven values this way.

**Resolve only the fields that need it.** Steps 2 and 4 reuse this same, possibly-partial,
set — do not rebuild it, and do not pass a flag for a field `--status` already showed correct.

---

#### Step 2 — Detect the scenario

Run the dry-run to classify the scenario. It is safe to run on `main` and writes nothing:

```bash
npx github:fredplex/vibe-coding-template . --dry-run
```

Read the output and classify using this table:

| `--dry-run` output | Scenario | What it means |
|--------------------|----------|---------------|
| All files `would-create` | **Init** — no `.ai/` workspace exists yet | First prime — files will be created |
| Mix of `would-create` + `would-update` | **Partial** — some files exist, some missing or outdated | First prime was incomplete or interrupted |
| Only `would-update` (no `would-create`) | **Re-prime** — workspace exists, templates improved | Smart update — only changed templates applied |
| All files `Up to date` | **Current** — nothing to do | Stop; report to human; do not proceed |

> **Reading the counts correctly.** The four `_TEMPLATE.md` stub files
> (`.ai/integrations/`, `.ai/assessments/`, `.ai/debug/`, `.ai/knowledge/`) are
> `skipIfExists` — after the first prime they always report as **skipped**, never as
> created or updated. Exclude them from your create/update tally. A healthy **Current**
> repo shows the workspace files all up-to-date plus those four skipped — that is normal,
> not a Partial state.

> **Before classifying the scenario — check for guide file updates.**
> Look in the dry-run output for `.ai/GUIDE.md` or `.ai/prompts/prime-prompt.md` in the
> `would-update` list.
>
> - **Neither present** → proceed to classify the scenario and continue to Step 3.
> - **Either present** → your execution context is out of date. **Stop.** Do not proceed.
>   Report to the human:
>
>   "The workspace guide files (`GUIDE.md` and/or `prime-prompt.md`) are included in this
>   template update. I should not continue — my execution instructions are the prior version
>   and the new version may differ. Please run the script directly to apply all updates
>   (including the guide files), then start a fresh agent session for any remaining work.
>   Use this headless command with only the flag values Step 1 needed to discover
>   (omit any field `--status` already showed as recorded and correct):"
>
>   Provide the fully-formed headless invocation. Do not proceed further.

**If scenario is Current** — report the status output to the human and stop. Do not proceed.

---

#### Step 3 — Create a branch

Before writing any files:

```bash
# For Init or Partial:
git checkout -b chore/prime-ai-docs

# For Re-prime / template update:
git checkout -b chore/prime-ai-docs-update
```

Never run the script on `main` or any existing feature branch.

---

#### Step 4 — Run the script

Construct and execute the headless invocation using **only the flags Step 1 actually needed
to resolve** — a field `--status` already showed as recorded and correct takes no flag at all;
the script reuses its saved value automatically. Example where only `--stack` needed
correcting (every other field was already recorded):

```bash
npx github:fredplex/vibe-coding-template . --yes --stack "<corrected stack>"
```

Example on a repo with no recorded context yet (first re-prime after upgrading, or every
field genuinely needed discovery in Step 1):

```bash
npx github:fredplex/vibe-coding-template . --yes \
  --name "<discovered name>" \
  --description "<discovered description>" \
  --stack "<discovered stack>" \
  --install "<discovered install>" \
  --dev "<discovered dev>" \
  --validate "<discovered validate>" \
  --test "<discovered test>"
```

**Do not add `--overwrite`** unless the human has explicitly instructed it in this session.
**Do not add `--no-backup`** under any circumstances.

If the script exits with an error, stop immediately and report the full error output
to the human before taking any further action.

---

#### Step 5 — Interpret the output and handle the backup

After the script completes, record:

**5a — Record the results:**
- **Files created** — count and list
- **Files updated** — count and list (Re-prime scenario only)
- **Files skipped** — count (already current or `skipIfExists` — includes the four
  `_TEMPLATE.md` stubs)
- **Warnings** — any `⚠️ LOCAL EDITS WILL BE REPLACED` lines (means a file you or the
  human customized — whether or not it still has placeholder markers — was overwritten
  and its backup must be merged before committing)
- **Backup location** — if any files were updated or overwritten, note the path:
  `.ai-prime-backup/{timestamp}/`

**5b — Determine whether a backup merge is required:**

| Scenario | Backup present? | Action |
|----------|----------------|--------|
| Init | No | No merge needed — proceed to Step 6 |
| Partial (only `would-create` fired) | No | No merge needed — proceed to Step 6 |
| Re-prime / Partial with updates | Yes | **Backup merge required** — follow Step 5c before proceeding |
| Any — `⚠️ LOCAL EDITS WILL BE REPLACED` fired | Yes | **Stop** — report warnings + backup path to human; wait for instruction |

**5c — Backup merge (Re-prime path):**

Read Part 3 of this file — it is the authoritative merge reference. Execute it now:
- Use the File risk classification table to triage each updated file
- For every **Project-specific** file: open the backup copy and the new live file; carry
  over human-authored content; verify no placeholder markers remain
- For every **Template-pure** file: accept as-is unless deliberate customisations were made
- Work through the merge order in Part 3 (highest-value first)
- Run the structural integrity check after each file
- Only proceed to Step 6 when all updated files have been reviewed and merged

---

#### Step 6 — Commit the generated files

First ensure `.ai-prime-backup/` is gitignored — **read `.gitignore` first**; only append
the line if it is not already present (never overwrite the file):

```bash
grep -qxF '.ai-prime-backup/' .gitignore || echo '.ai-prime-backup/' >> .gitignore
```

Then stage and commit the workspace files, including `.ai-prime-versions.json` — it is
git-tracked by design so recorded context and per-file versions survive a fresh clone or CI,
not just your local machine:

```bash
git add .ai/ docs/ AGENTS.md CLAUDE.md .gitignore .ai-prime-versions.json
git commit -m "chore: prime AI agent workspace via vibe-coding-template"
```

Do not stage `.ai-prime-backup/` or `.ai-prime-manifest.json` — both are gitignored runtime
artifacts (a per-run backup directory and a per-run log), unlike `.ai-prime-versions.json`.

---

#### Step 7 — Report back and stop

Report to the human:

1. **Scenario detected** — which of the four scenarios applied
2. **Script version / template version** — e.g. `script v3.2.0 / templates v3.2.0`
3. **Files created / updated / skipped** — counts
4. **Backup merge** — was a merge performed? Which files were merged? Any unresolved
   placeholders remaining?
5. **Commit hash** — from Step 6
6. **Fill-in required** — list every ★ file below that was created or updated

**Files requiring fill-in (★)**:

| File | What needs filling in |
|------|-----------------------|
| `AGENTS.md` | Architecture section, Project Context posture line, Key Boundaries lists |
| `.ai/memory/project-state.md` | Product identity, operational phase, approved mutable scope, forbidden scope |
| `.ai/memory/architecture-decisions.md` | Key architectural choices and rationale |
| `.ai/rules/mutation-rules.md` | Currently Approved mutations list |
| `docs/architecture.md` | Full architecture description and data flow |
| `docs/project-rules.md` | Product vision and explicit out-of-scope items |
| `docs/feature-state.md` | Actual feature inventory |
| `docs/tech-stack.md` | Real technology versions and rationale |
| `docs/testing.md` | Actual test framework, file location, test count, coverage targets |

**Stop here.** Do not begin fill-in, do not merge to `main`. Wait for the human to confirm
next steps.

---

#### After human confirmation

If the human says "proceed with fill-in" or similar:

Read Part 2 of this file — it contains the fill-in priority order and exact instructions
for completing setup with an AI agent.

If the human says "merge" or "push":

Follow the branch merge protocol: push the task branch and confirm with the human before
merging to `main`.

---

### Reference — for humans (not agent instructions)

> The material below documents the script's CLI surface and common operations for human
> readers. **It is not a procedure to follow** — agents should rely on the numbered steps
> above. Humans running the script manually (interactively or via flags) can use this
> section as a lookup reference.

#### Invocation

```bash
# Interactive (recommended for first run)
npx github:fredplex/vibe-coding-template .

# Dry run — preview what would be created or updated, no files written
npx github:fredplex/vibe-coding-template . --dry-run

# Show deployed template versions + recorded project context (read-only)
npx github:fredplex/vibe-coding-template . --status

# Headless — skip prompts, supply all values via flags
npx github:fredplex/vibe-coding-template . --yes \
  --name "My App" \
  --description "One-line description" \
  --stack "Node.js, TypeScript" \
  --install "npm ci" \
  --dev "npm run dev" \
  --validate "task docker-build" \
  --test "task verify"

# Force overwrite existing files (backs up first)
npx github:fredplex/vibe-coding-template . --overwrite --yes --name "My App" ...
```

#### What the interactive prompts ask for

| Prompt | What to provide |
|--------|----------------|
| **Project name** | Repo or product name. Defaults to `package.json` name or directory name. |
| **One-line description** | What this project does and for whom — one sentence. |
| **Tech stack** | Comma-separated key technologies: `Next.js, TypeScript, Postgres` |
| **Install command** | How to install dependencies: `npm ci`, `pnpm install`, etc. |
| **Dev server command** | How to start local development: `npm run dev`, etc. |
| **Static validation gate** | Command that runs type-check, lint, and/or syntax check. |
| **Runtime / E2E test command** | Command that runs integration or E2E tests. |

Accurate values save rework — these appear throughout the generated files. If your project
doesn't yet have a static validation or test command, use `echo ok` as a placeholder — once
the real command is known, just pass that one flag on a later run (see *Saved context
replay* below); no `--overwrite` needed.

#### Smart update (re-running on an existing repo)

The script compares each file's deployed version (from the `<!-- prime: version=... -->`
control section on line 1) against the current template version. Only files with improved
templates are updated; files already at the current version are untouched.

```bash
# Preview what would update
npx github:fredplex/vibe-coding-template . --dry-run

# Apply updates
npx github:fredplex/vibe-coding-template . --yes --name "My App" ...
```

When files are updated, a timestamped backup is written to `.ai-prime-backup/{timestamp}/`.
Add `.ai-prime-backup/` to your `.gitignore`.

#### Saved context replay

Every run saves the resolved context (`name`/`description`/`stack`/`install`/`dev`/`validate`/
`test`) to `.ai-prime-versions.json`. The next run reuses it automatically — a repeat update
with no flags at all needs no prompts. `--status` shows what's currently recorded under
`Recorded Context`. Three ways to change what's saved:

- **Pass a flag** — overrides that one field for this run, and becomes the new saved value.
- **`--reconfigure`** — re-opens the interactive questionnaire for every field, pre-filled with
  its current saved value, so you can review and update several at once instead of crafting
  flags by hand. No effect combined with `--yes`.
- **`--reset-context`** — ignores everything saved and re-derives from scratch (flags →
  auto-detection → prompt), as if the repo had never been primed. Whatever gets resolved this
  run becomes the new saved state.

#### Verify generated commands after priming

Open `AGENTS.md` and `CLAUDE.md` and confirm the commands in the Quick Commands block match
your project's actual commands.

#### If context values need correction

For one or two wrong values, pass just those flags — no `--overwrite` needed:

```bash
npx github:fredplex/vibe-coding-template . --yes --stack "Correct stack" --validate "correct-command"
```

To review and correct several values interactively:

```bash
npx github:fredplex/vibe-coding-template . --reconfigure
```

Reserve `--overwrite` (regenerates every file from scratch, backing up first) for when a
file's structure itself is broken, not just a wrong context value.

---

## Part 2 — After First Prime: Fill In the Generated Files

The script generates 32 files. Most are ready to use immediately. A subset contains
placeholder sections that require human-authored project-specific content before the first
development session.

### Priority fill-in order

Fill these in before any development work begins. A human must review and confirm each one —
an agent can draft the content, but should not start coding until a human has approved:

1. **`AGENTS.md` → Architecture** — replace the pattern examples with the actual data flow
   and layer structure for this project
2. **`AGENTS.md` → Project Context → Current posture** — replace the placeholder line
3. **`AGENTS.md` → Key Boundaries** — fill in the ✅ Approved and 🚫 Not approved lists
4. **`.ai/memory/project-state.md`** — Product Identity, Operational Phase, Approved Mutable
   Scope, Forbidden scope
5. **`.ai/rules/mutation-rules.md` → Currently Approved** — list every approved mutation
   explicitly; anything not listed is treated as forbidden
6. **`docs/architecture.md`** — full architecture description with layer responsibilities
7. **`docs/project-rules.md`** — product vision and explicit out-of-scope items
8. **`docs/tech-stack.md`** — real technology versions and rationale
9. **`docs/testing.md`** — actual test framework name, file location, current test count, and
   coverage targets; delete the test-type sections that do not apply to this project
10. **`.ai/workflows/definition-of-done.md` and `.ai/rules/engineering-rules.md` → Archetype
    sections** — delete the Web UI/BFF, API/Backend, or CLI/Library sections that don't match
    this project, keeping only the one that applies. The script detects leftover sections
    automatically: `⚠️ ARCHETYPE SECTIONS PRESENT` prints after any run that writes either
    file — treat that warning as your reminder to complete this step. (`AGENTS.md`'s
    archetype-flavored pattern examples are covered by item 1 above, not this automated check.)

### Files that need no fill-in

All `.ai/workflows/`, `.ai/prompts/`, `.ai/tasks/`, `.ai/SESSION_NOTES.md`, and
`.ai/README.md` ship ready to use. The four `_TEMPLATE.md` stub files
(`.ai/integrations/`, `.ai/assessments/`, `.ai/debug/`, `.ai/knowledge/`) are created once
and used on demand: when you need to document an integration, investigate a bug, capture a
quick-reference card, or run a pre-implementation assessment — copy the relevant stub, rename
it (e.g. `.ai/integrations/stripe.md`), and fill it in. Delete stubs you never use.

### How to fill in with an AI agent

Start a new session and say:

> "Read `.ai/GUIDE.md` Part 2 and help me fill in the placeholder sections in priority order.
> Survey the existing project first before drafting any content."

The agent will read the existing source, infer accurate content, and present each section
for your review before writing.

---

## Part 3 — After a Template Update: Merging Backup Content

When the script updates a file (smart update or overwrite), it backs up the existing version
to `.ai-prime-backup/{timestamp}/{relPath}` before writing the new template. You must merge
your project-specific content from the backup into the updated files — the script cannot do
this for you.

### File risk classification

Before starting a merge, determine which updated files require a merge and which can be
accepted directly:

| Classification | Files | After regeneration |
|---|---|---|
| **Project-specific** (always merge) | `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/tech-stack.md`, `docs/feature-state.md`, `docs/testing.md`, `.ai/memory/project-state.md`, `.ai/rules/mutation-rules.md` | **Always open the backup** — verify no placeholder markers remain; restore custom content before committing |
| **Template-pure** (safe to accept) | `.ai/GUIDE.md`, `.ai/prompts/prime-prompt.md`, all `.ai/workflows/`, all other `.ai/prompts/`, `.ai/rules/engineering-rules.md`, `.ai/rules/security-rules.md`, `.ai/tasks/`, `.ai/SESSION_NOTES.md`, `.ai/README.md` | Safe to accept directly if you have not made deliberate customisations to the live file. Note: `GUIDE.md` and `prime-prompt.md` are called out explicitly because these are the files the guide meta-file update guard watches for — if either was updated, the agent stopped before the script run and the human ran the script directly. |

> The script emits `⚠️ LOCAL EDITS WILL BE REPLACED` when a regenerated file's prior content
> no longer matches what the script last wrote — either because it still has unfilled
> placeholder markers, or because the file was hand-edited since (detected by comparing a
> content hash, independent of markers). This always means a merge review is required — do
> not commit until the backup content has been merged in.

### Merge principle

**The new file's structure wins.** Never copy an old file wholesale. Extract only the
human-authored content from the backup and place it into the equivalent sections of the new
file.

### What to carry over from the backup

- Architecture diagrams and data flow descriptions
- Key Boundaries — the actual ✅ Approved / 🚫 Not approved lists for this project
- Currently Approved mutations in `mutation-rules.md`
- Product identity, operational phase, approved scope in `project-state.md`
- Real tech versions, rationale, and key decisions
- Actual feature inventory and testing strategy specifics

### What NOT to carry over

- Section headers and subheadings — use the new file's versions
- Guidance comments, HTML comments, italicised prompts
- Template boilerplate text that the new version has improved
- Any text still containing placeholder markers (`<your content>`, `TODO`, `[Fill in...]`)

### Merge order (highest-value first)

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

### Per-file merge steps

1. Read the **new** file first — understand its structure and which sections are placeholders.
2. Read the **backup** file — identify project-specific content in each section.
3. For each placeholder in the new file: if the backup has real content for the equivalent
   section, copy that content in. Copy content only — not surrounding headers or guidance
   text from the backup.
4. Leave all structural improvements in the new file intact.
5. After merging: scan for any remaining placeholder markers and flag them.

### Structural integrity check (after each file)

- [ ] All section headings from the new file are present and unchanged
- [ ] No guidance comments or fill-in prompts from the backup were reintroduced
- [ ] No placeholder markers remain where backup content was available

### How to merge with an AI agent

Start a new session and say:

> "Read `.ai/GUIDE.md` Part 3 and help me merge the backup at `.ai-prime-backup/{timestamp}/`
> into the updated files."

The agent will work through the merge order, present each section for your review, and flag
any remaining placeholders before committing.
