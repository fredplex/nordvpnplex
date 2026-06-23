# AGENTS.md

Main entry point for coding agents working in this repository.

**Current source code is runtime truth.** If docs and code disagree, report the mismatch and treat source as authoritative.

---

## Quick Start

### First Time Here?

1. Read this file (5 minutes)
2. Read `docs/README.md` — product documentation overview
3. **Read the core product docs (required, not optional):**
   - `docs/project-rules.md` — product vision, boundaries, and governance
   - `docs/architecture.md` — full architecture philosophy and design decisions
   - `docs/tech-stack.md` — technology choices, rationale, and dependency versions
   - `docs/testing.md` — testing strategy, validation gates, and coverage expectations
4. Read `.ai/README.md` — agent workspace overview
5. Follow `.ai/workflows/onboarding.md` — complete onboarding
6. Read `.ai/current.md` — handoff state: what's done, what's next, fragile areas
7. Read `.ai/SESSION_NOTES.md` (last entry only) — stopping point and key decisions from the previous session

### Commands

```bash
task docker-build    # Build local test image (tagged with git hash)
task verify          # Smoke-test the local image
task check-version   # Check NordVPN Debian repo for newer versions
task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y.y.y   # Apply version bump
task release         # Tag + push to trigger GitHub publish workflow
task                 # (no args) print current git tag and hash
```

> **No npm/Node.js in this project.** The PRIME template's npm commands do not apply.

---

## Project Context

**fredplex/nordvpn** — Custom Docker image packaging the official NordVPN Linux client for use as a VPN gateway on Unraid NAS systems. Other containers route their traffic through it via `--net=container:vpn`.

**Tech stack**: Ubuntu Noble base (linuxserver.io), NordVPN Linux client, WireGuard/NordLynx, s6-overlay, Taskfile, Docker, GitHub Actions

**Current posture**: Human-in-the-loop release cycle. No fully automated publish — owner reviews, builds locally, verifies, then triggers publish via `task release`.

Key characteristics:
- Based on `ghcr.io/linuxserver/baseimage-ubuntu:noble` (brings the s6 process supervisor)
- NordVPN is installed at build time from the official Debian package repo, pinned to a specific version
- A hardened iptables kill switch fires before the VPN connects — no traffic leaks if the VPN fails to start
- Reconnection handled by a watchdog script (`nord_watch`) that polls on a configurable interval
- The owner is the sole maintainer; all destructive or publish actions require explicit approval

---

## Architecture

This is a **Docker container build project** — not a web app, API, or library.

```
NordVPN Debian repo ──► Weekly GitHub Action ──► Draft PR (human reviews)
                                                        │
                                                        ▼
                                               Human merges PR
                                                        │
                                                        ▼
                                         task docker-build  (local)
                                                        │
                                                        ▼
                                           task verify  (local)
                                                        │
                                                        ▼
                                          task release  (creates git tag, pushes)
                                                        │
                                                        ▼
                                       GitHub Action: publish ──► Docker Hub
```

### Container startup sequence (s6-overlay)

s6 cont-init.d (in filename order):
`00-firewall → 00-version → 10-tun → 20-inet/inet6 → 30-route/route6 → 40-allowlist`

then CMD: `nord_login → nord_config → nord_connect → nord_watch`

The kill switch (`00-firewall`) runs **first** — traffic is blocked before the VPN connects.

### s6 process supervisor primer

- `rootfs/etc/cont-init.d/` scripts run **once at startup**, in filename order, before any services start — they must exit cleanly
- `rootfs/etc/services.d/nordvpn/run` is a **long-running managed service**; s6 restarts it if it exits
- Do not add sleep loops or background processes to cont-init.d scripts — they block subsequent init stages

### Version in the image

`ARG IMAGE_VERSION` in Dockerfile → `ENV IMAGE_VERSION` and OCI label `org.opencontainers.image.version`.

- `task docker-build` injects the **git hash** as IMAGE_VERSION (test builds)
- `task release` + GitHub publish inject the **semver tag** (published images)

Query version without running the container:
```bash
docker inspect <image> --format '{{index .Config.Labels "org.opencontainers.image.version"}}'
```

See `docs/architecture.md` for the full architecture reference.

---

## Required Reading

Before significant work, read relevant files:

### Core Product Docs (required)
- `docs/project-rules.md` — product vision, boundaries, governance
- `docs/architecture.md` — architecture, startup sequence, design decisions
- `docs/tech-stack.md` — technology choices and rationale
- `docs/testing.md` — validation gates and smoke-test strategy
- `docs/build-and-publish.md` — complete human + agent reference for the release workflow

### Core Rules
- `.ai/rules/mutation-rules.md` — what is and is not approved to change
- `.ai/rules/engineering-rules.md` — implementation rules
- `.ai/rules/security-rules.md` — trust boundaries

### Memory
- `.ai/memory/project-state.md` — current product posture and approved scope
- `.ai/memory/architecture-decisions.md` — key architectural choices

### Workflows
- `.ai/workflows/onboarding.md` — getting started
- `.ai/workflows/implementation.md` — plan → code → test → validate
- `.ai/workflows/validation.md` — testing gates
- `.ai/workflows/review.md` — code review checklist

### Tasks
- `.ai/current.md` — live handoff state
- `.ai/tasks/active.md` — what is in flight or queued next

### Version
- `.ai-prime-version` — template version used to generate this project
- `.ai-prime-versions.json` — per-file version record; used by the script's smart update to detect which files have improved templates available

---

## Key Boundaries

### Product Posture

✅ **Approved**:
- Version bumps (NordVPN client version and IMAGE_VERSION)
- Local builds and smoke tests via Taskfile
- Editing `rootfs/` scripts (cont-init.d, services.d, usr/bin)
- Documentation updates
- GitHub Actions workflow modifications (when explicitly asked)

🚫 **Not approved** (requires explicit owner instruction):
- Pushing to remote (`git push`) — owner pushes manually after verifying the local image
- Bumping the base image (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) without explicit instruction
- Modifying `Taskfile.yml` without explicit instruction
- Auto-merging PRs
- Any action that publishes to Docker Hub without a human-created git tag

### Architecture Boundaries

✅ **Must**:
- Confirm both version strings with owner before editing any file on a version bump
- Verify the NordVPN `.deb` exists in the official repo before touching the Dockerfile
- Show a diff of every planned change and wait for approval before applying
- Add new `rootfs/` scripts with LF line endings (`.gitattributes` enforces this on checkout)
- Keep Changelog entries in `README.md` under `## Changelog`, newest first

🚫 **Must not**:
- Use CRLF line endings in `rootfs/` files (scripts fail inside the container with `bad interpreter`)
- Add sleep loops or background processes to `cont-init.d/` scripts
- Push Docker images without the human-in-the-loop gate
- Add mutations without approval gate

---

## Version Bump Workflow

Triggered manually by the owner when NordVPN releases a new client version.

### Before editing any file — verify the package exists

```
https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/
```

Look for `nordvpn_<NORDVPN_VERSION>_amd64.deb`. If not listed, do not proceed.

### Version bump locations — ALL must change in one commit

| File | Field |
|---|---|
| `Dockerfile` line 6 | `ARG NORDVPN_VERSION='x.x.x'` |
| `Dockerfile` line 7 | `ARG IMAGE_VERSION='x.x.x'` |
| `README.md` | "Current version" line |
| `CLAUDE.md` | `## Current Pinned Version` block |
| `.ai/current.md` | all fields |

**Preferred:** run `task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y.y.y` — the script handles all edits and verifies the package exists first.

### Steps
1. Confirm both version strings with owner before touching any file
2. Verify the package exists in the repo (see above)
3. Show a unified diff of every planned change; wait for approval
4. Apply changes (or let the agent run `task bump`)
5. Owner runs `task docker-build` locally to verify the image
6. Owner runs `task verify` locally to smoke-test
7. Owner runs `task release` — creates annotated tag and pushes it; triggers GitHub publish workflow
8. Update `.ai/current.md` to reflect the new version, build date, and pushed tags

---

## Project File Map

```
Dockerfile                        — primary build; version ARGs live here
Taskfile.yml                      — local build/publish tasks (do not modify without instruction)
README.md                         — user docs + Changelog
CLAUDE.md                         — AI context and workflow rules
AGENTS.md                         — this file
scripts/
  bump.sh                         — version-bump script; edits all 5 locations
  check-version.sh                — scrapes NordVPN Debian repo; prints task bump command
  verify.sh                       — smoke-tests the locally built image
docs/
  build-and-publish.md            — full human + agent reference: workflow, triggers, manual steps, secrets setup
  architecture.md                 — architecture details
  tech-stack.md                   — technology choices
  project-rules.md                — product vision and governance
  feature-state.md                — feature inventory
  testing.md                      — testing strategy
.github/workflows/
  build-validate.yml              — PR → docker build (no push)
  publish.yml                     — tag push → build + push to Docker Hub
  check-nordvpn-release.yml       — weekly cron: detect new NordVPN, open draft PR
.gitattributes                    — enforces LF line endings on all rootfs/ scripts
.ai/
  current.md                      — live session state (update after each bump)
  plans/                          — implementation plans
rootfs/
  etc/
    cont-init.d/
      00-firewall                 — iptables kill switch (drops all traffic before VPN is up)
      00-version                  — prints IMAGE_VERSION banner (reads ENV set at build time)
      10-tun                      — creates /dev/net/tun if missing
      20-inet / 20-inet6          — IPv4/IPv6 interface setup
      30-route / 30-route6        — routing table setup for local network access
      40-allowlist                — punches iptables holes for ALLOW_LIST domains
    services.d/nordvpn/
      run                         — s6 service: starts nordvpnd daemon
      finish                      — s6 finish hook
      data/check                  — s6 readiness check
  usr/bin/
    nord_login                    — authenticates via TOKEN / TOKENFILE env var
    nord_config                   — applies TECHNOLOGY, DNS, FIREWALL, MESHNET, LAN_DISCOVERY env vars
    nord_connect                  — connects with exponential backoff retry; runs PRE/POST_CONNECT hooks
    nord_watch                    — polls CHECK_CONNECTION_URL; triggers s6 restart on failure
    dockerNetworks / dockerNetworks6 — Docker network helpers
```

### Line endings — critical on Windows

`.gitattributes` enforces **LF** line endings for all files under `rootfs/`. Shell scripts with CRLF endings fail inside the container with `bad interpreter` or silent parse errors. When creating or editing any `rootfs/` file on Windows, verify your editor is not converting to CRLF.

### `task docker-build` vs `task release` — image version behavior

`task docker-build` passes `--build-arg="IMAGE_VERSION={{.GIT_HASH}}"`, overriding the Dockerfile ARG. Local test builds write the git commit hash into `IMAGE_VERSION` ENV — not the semantic version. Only `task release` (which triggers the publish workflow) produces an image with the semver `IMAGE_VERSION`. Seeing the hash on a local test build is expected and correct.

---

## Environment Variables (runtime)

| Variable | Default | Notes |
|---|---|---|
| `TOKEN` | — | NordVPN account token (required unless TOKENFILE set) |
| `TOKENFILE` | — | Path to file containing the token (docker secrets) |
| `CONNECT` | recommended server | Country/server/city/group string |
| `TECHNOLOGY` | `NordLynx` | `NordLynx` or `OpenVPN` |
| `DNS` | — | Up to 3 servers, comma/semicolon delimited; disables CyberSec |
| `CYBER_SEC` | — | `Enable` / `Disable` |
| `FIREWALL` | — | `Enable` / `Disable` |
| `OBFUSCATE` | — | `Enable` / `Disable` (OpenVPN only) |
| `PROTOCOL` | — | `TCP` or `UDP` (OpenVPN only) |
| `MESHNET` | — | `Enable` / `Disable` |
| `ALLOWLOCAL` | — | Comma-delimited Meshnet device names allowed to access this device's local network |
| `ALLOWROUTE` | — | Comma-delimited Meshnet device names allowed to route traffic through this device |
| `LAN_DISCOVERY` | — | `on` / `off` |
| `ALLOW_LIST` | — | Comma-delimited domains accessible outside the VPN |
| `WHITELIST` | — | Legacy alias for `ALLOW_LIST`; both supported, prefer `ALLOW_LIST` |
| `NET_LOCAL` | — | CIDR(s) for local network routes, e.g. `192.168.1.0/24` |
| `NET6_LOCAL` | — | IPv6 CIDR(s) for local network routes |
| `PORTS` | — | Semicolon-delimited ports to whitelist (UDP+TCP) |
| `PORT_RANGE` | — | Port range to whitelist, e.g. `9091 9095` |
| `PRE_CONNECT` | — | Shell command to run before connecting |
| `POST_CONNECT` | — | Shell command to run after successful connection |
| `CHECK_CONNECTION_INTERVAL` | `300` | Seconds between watchdog polls |
| `CHECK_CONNECTION_URL` | `www.google.com` | URL used to verify connectivity |

---

## GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `.github/workflows/build-validate.yml` | PR → main | `docker build` only — no push. Catches Dockerfile errors early. |
| `.github/workflows/publish.yml` | Push of semver tag (e.g. `5.6.0`) | Builds and pushes `:latest` + `:<tag>` to Docker Hub. |
| `.github/workflows/check-nordvpn-release.yml` | Weekly cron (Mon 08:00 UTC) + manual | Checks NordVPN package repo; opens draft PR if newer version available. |

### Required GitHub repo secrets

Set in **Settings → Secrets and variables → Actions**:
- `DOCKER_USERNAME` — Docker Hub username (`fredplex`)
- `DOCKER_TOKEN` — Docker Hub access token (generate at hub.docker.com → Account Settings → Security)

---

## Validation

### After a file edit
```bash
# No static gate (no npm/lint/typecheck). Validate by building:
task docker-build
task verify
```

For narrower per-change-type validation chains, see `.ai/workflows/validation.md`.

### Before Declaring Done
```bash
task docker-build    # Must succeed (image builds)
task verify          # Must pass all 4 checks
# Then owner runs: task release
```

### Verify checks
1. `IMAGE_VERSION` ENV = git hash (via `docker inspect`)
2. `nordvpn --version` = NORDVPN_VERSION (one-shot container)
3. iptables OUTPUT policy = DROP (kill-switch functional)
4. nordvpnd socket present at `/run/nordvpn/nordvpnd.sock` (12s runtime check)

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
- A new agent must learn current state from the standard path without hunting

---

## Quick Reference

### Commands
| Command | Purpose |
|---------|---------|
| `task docker-build` | Build local test image (tagged with git hash) |
| `task verify` | Smoke-test the local image (4 checks) |
| `task check-version` | Check NordVPN Debian repo for newer versions |
| `task bump NORDVPN_VERSION=x IMAGE_VERSION=y` | Apply version bump to all 5 locations |
| `task release` | Create annotated git tag + push (triggers publish workflow) |
| `task` (no args) | Print current git tag and hash |

### Tag / Release Naming Convention
- Git tag = `IMAGE_VERSION` (e.g. `5.5.0`)
- Docker tags published: `:latest` and `:<IMAGE_VERSION>` (e.g. `fredplex/nordvpn:5.5.0`)
- Git tag annotation: `"bump to NordVPN <NORDVPN_VERSION>"`

### File Structure
```
Dockerfile            # Primary build file; version numbers live here
Taskfile.yml          # Local build/publish tasks
scripts/              # bump.sh, check-version.sh, verify.sh
rootfs/               # Container filesystem (cont-init.d, services.d, usr/bin)
docs/                 # Product documentation (comprehensive reference)
.github/workflows/    # CI/CD: build-validate, publish, check-nordvpn-release
.ai/                  # Agent workspace (distilled working context)
```

---

## Known Issues / Open Items

- **README.md** currently mirrors the upstream `bubuntux/nordvpn` project (badges, examples, issue links). A project-specific README with the actual Changelog section is needed (Tier 3 / R8 — deferred).
