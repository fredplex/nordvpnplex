<!-- prime: version=3.0.3 template=AGENTS.md date=2026-07-17 -->
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

**Tech stack**: Docker, Ubuntu Noble (linuxserver.io base), NordVPN Linux client (Debian pkg), WireGuard/NordLynx, s6-overlay, Taskfile, GitHub Actions

**Current posture**: Stable maintenance — update NordVPN client version as new packages release, verify, publish. No active feature development. Human-in-the-loop release gate (owner PR merge → GHA CD).

---

## Architecture

This is a **Docker container build project** — not a web app or API. No Node.js, no database, no REST surface.

### Release data flow
```
NordVPN Debian repo ──► Daily GHA (check-nordvpn-release.yml)
                                │ (if update found)
                                ▼
                       GHA auto dev-build + smoke tests
                                │
                                ▼
                        GHA opens draft PR ──► Owner reviews & merges
                                                        │
                                                        ▼
                                            GHA publish.yml (CD)
                                                        │
                                          ┌─────────────┴──────────────┐
                                          ▼                            ▼
                                      Docker Hub                GitHub Release
                                  :latest, :<version>          (tag + email notify)
```

### Container startup sequence
```
Docker starts container
        │
s6-overlay (PID 1)
        │
cont-init.d (in filename order):
  00-firewall  → iptables OUTPUT = DROP  ← kill switch fires FIRST
  00-version   → print IMAGE_VERSION banner
  10-tun / 20-inet / 20-inet6 / 30-route / 30-route6 / 40-allowlist
        │
services.d/nordvpn/run → nordvpnd daemon (s6-supervised)
        │
CMD: nord_login → nord_config → nord_connect → nord_watch
```

**Key rules**:
- Kill switch (`00-firewall`) fires before the VPN connects — traffic stays blocked on startup failure
- Human PR merge is the only release gate — no automated image push to Docker Hub
- `NordVPN_VERSION` must be pinned to a real `.deb` in the official apt repo
- LF line endings in all `rootfs/` scripts (CRLF causes `bad interpreter`)

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
- Version bumps via `task bump` (NordVPN client version and/or IMAGE_VERSION)
- `rootfs/` script edits (cont-init.d, services.d, usr/bin)
- Documentation updates (AGENTS.md, CLAUDE.md, docs/, .ai/)
- GitHub Actions workflow edits (when explicitly requested)
- Local dev builds (`task docker-build`) and smoke tests (`task verify`)

🚫 **Not approved** (requires explicit owner approval):
- Automated image push to Docker Hub without human-created git tag
- Base image digest bump without explicit owner instruction
- `Taskfile.yml` modifications (beyond the two approved changes: `DOCKER_BUILDKIT=1` env + `task verify-live`)
- Auto-merging any PR
- Adding Node.js/npm tooling, Renovate, or automated dependency bumps
- Web UI, management interface, or multi-user support

### Architecture Boundaries

✅ **Must**:
- Kill switch (`cont-init.d/00-firewall`) must fire before nordvpnd starts — iptables OUTPUT = DROP before any VPN traffic
- `NordVPN_VERSION` must be pinned to a real `.deb` in the official NordVPN apt repo
- LF line endings enforced in all `rootfs/` scripts (`.gitattributes` handles checkout; verify on Windows)
- `DOCKER_BUILDKIT=1` set for all local builds (`COPY --chmod=0755` requires it)
- Any `Dockerfile` or `rootfs/**` change merged to `main` must include an `IMAGE_VERSION` bump (hard-fail CI guard in `build-validate.yml`)

🚫 **Must not**:
- Push to Docker Hub without owner-merged PR triggering GHA CD (or explicit owner `task release`)
- Add a `# syntax` directive to the Dockerfile (triggers 401 from Docker Hub for the BuildKit frontend)
- Remove `curl` from the image (`nord_watch` uses it at runtime to poll `CHECK_CONNECTION_URL`)
- Add mutations without owner approval gate

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
Dockerfile            # Image definition — base, NordVPN install, rootfs copy, HEALTHCHECK, CMD
rootfs/               # Everything copied into the container at build time
  etc/cont-init.d/    # s6 one-shot init scripts (firewall, version banner, network, allowlist)
  etc/services.d/     # s6 long-running service (nordvpnd daemon)
  usr/bin/            # CMD scripts: nord_login, nord_config, nord_connect, nord_watch
scripts/              # Host-side tooling: bump.sh, verify.sh, check-base-image.sh, etc.
.github/workflows/    # GHA pipelines: build-validate, publish, publish-dev, check-nordvpn-release, check-base-image
Taskfile.yml          # Task runner: docker-build, verify, bump, release, check-version, check-base
docs/                 # Product documentation (comprehensive reference)
.ai/                  # Agent workspace (distilled working context)
```
