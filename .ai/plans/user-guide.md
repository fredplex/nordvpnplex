# User Guide — Owner Reference Doc
Created: 2026-06-23 | Status: Pending review

## Background — why this is needed

There is currently no single document a human owner can open to understand how the project
works end-to-end, what every `task` command does, what GitHub Actions are available and how
to trigger them, what environment variables the container accepts at runtime, and how to
perform the version bump workflow. The information exists but is scattered:

- `docs/build-and-publish.md` — detailed build/publish lifecycle (agent + human)
- `AGENTS.md` — runtime env var table, file map, architecture (agent-focused)
- `README.md` — currently mirrors upstream `bubuntux/nordvpn`; not project-specific

The new doc fills this gap as a **human-first operational reference** for the project owner.

---

## Scope

**In:**
- What this project is and how it works (one-paragraph overview + diagram)
- All `task` commands: name, purpose, when to use, expected output
- GitHub Actions: all three workflows, their triggers, and how to trigger each manually
- Version bump workflow — both paths (automated draft PR and fully manual)
- Runtime environment variables — complete table (from AGENTS.md)
- Troubleshooting section (consolidate existing entries from build-and-publish.md)

**Out:**
- Agent-specific instructions, planning rules, mutation rules — those stay in AGENTS.md / .ai/
- Architecture internals (s6 startup sequence, kill-switch design) — stays in docs/architecture.md
- README.md rewrite — separate deferred task (Tier 3, not approved yet); user-guide content will feed it when the time comes

The new doc does **not replace** `docs/build-and-publish.md`; that doc serves agents and
contains more detail. The new doc is the owner's quick-reference companion.

---

## Output file

`docs/user-guide.md`

---

## Proposed document structure

```
# User Guide

## What is this?
  One paragraph: project purpose, what the image does, where it runs (Unraid)

## How it works
  Mermaid-free ASCII diagram: Detection → Bump → Build → Verify → Release
  Prose: who does what at each step; human gates explained

## Task commands
  Table: command | purpose | when to use
  Then one subsection per command with: description, example output, notes

    ### task (no args)
    ### task check-version
    ### task bump
    ### task docker-build
    ### task verify
    ### task release

## GitHub Actions
  Table: workflow | trigger | what it does | manual trigger?
  Then one subsection per workflow:

    ### Check NordVPN Release (weekly / manual)
    ### Build Validation (PR gate)
    ### Publish to Docker Hub (tag push)

## Version bump workflow
  ### Path A — Automated (recommended)
    Step-by-step from "draft PR appears" to "image on Docker Hub"
  ### Path B — Fully manual
    Step-by-step using task check-version + task bump

## Runtime environment variables
  Complete table (21 vars from AGENTS.md): variable | default | notes
  Brief prose on required vs optional vars

## One-time setup — Docker Hub credentials in GitHub
  When needed (first publish or token rotation)
  Step 1: create Docker Hub access token (hub.docker.com → Account Settings → Security)
  Step 2: add DOCKER_USERNAME + DOCKER_TOKEN secrets to GitHub repo
  Step 3: verify with a test tag push
  (content from docs/build-and-publish.md section 7 — consolidated here so owner has one place to look)

## Troubleshooting
  Consolidated from docs/build-and-publish.md section 8 + any additional known issues
```

---

## Execution order

| Step | Action | Notes |
|------|--------|-------|
| 1 | Create branch `docs/user-guide` | First write action |
| 2 | Create `docs/user-guide.md` with all sections | Single commit |
| 3 | Add entry to `docs/README.md` navigation index | Same commit or follow-up |
| 4 | Present diff for owner review | No merge until approved |

Single-phase work — no intermediate commits needed. The doc is entirely new content;
no existing files are modified except `docs/README.md` (index entry added).

---

## Validation

- [ ] All 6 `task` commands documented with correct descriptions
- [ ] All 3 GitHub Actions documented with correct triggers
- [ ] Runtime env var table matches AGENTS.md (21 variables, same defaults)
- [ ] Both version bump paths are step-by-step complete
- [ ] Troubleshooting entries match `docs/build-and-publish.md` section 8
- [ ] Owner review: confirms doc is accurate and complete before merge

---

## Decisions

1. **README relationship**: lives independently as `docs/user-guide.md` for now; will feed
   the README rewrite when that Tier 3 task is approved.

2. **Diagrams**: use Mermaid (GitHub renders natively). Main workflow diagram (Detection →
   Bump → Build → Verify → Release) as a `flowchart TD`.
