# CLAUDE.md

This file is read automatically by Claude Code at the start of every session.

**Read [`AGENTS.md`](AGENTS.md) first.** It is the primary entry point for nordvpn and contains architecture, key boundaries, validation gates, and working rules.

## Quick Commands

```bash
task docker-build    # Build local test image (tagged with git hash)
task verify          # Smoke-test the local image (4 checks)
task check-version   # Check NordVPN Debian repo for newer versions
task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y.y.y   # Apply version bump
task release         # Create annotated git tag + push (triggers GitHub publish)
task                 # (no args) print current git tag and hash
```

> **No npm in this project.** This is a Docker container build project — no Node.js runtime.

## Session Start Protocol

1. Read `AGENTS.md` → `.ai/current.md` → `.ai/tasks/active.md` → `.ai/SESSION_NOTES.md` (last entry only)
2. Report back: Current State / Next Task / Ambiguity / Fragile Areas
3. **Wait for human confirmation before writing anything**
4. First write action: `git checkout -b <type>/<name>`

Full onboarding workflow: `.ai/workflows/onboarding.md`

## Constraints

- **Never push to the remote** — owner pushes manually after verifying the local image
- **Never bump the base image** (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) without explicit instruction
- **Never modify `Taskfile.yml`** without explicit instruction
- Changelog entries go in `README.md` under `## Changelog`, newest first
- No Renovate bot — `renovate.json` has been removed

## Current Pinned Version

<!-- Update this after each successful rebuild -->
NordVPN: 4.5.0  |  Image tag: fredplex/nordvpn:5.5.0  |  Built: 2026-03-16
