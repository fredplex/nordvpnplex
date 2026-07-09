<!-- prime: version=3.0.1 template=CLAUDE.md date=2026-07-01 -->
# CLAUDE.md

This file is read automatically by Claude Code at the start of every session.

**Read [`AGENTS.md`](AGENTS.md) first.** It is the primary entry point for nordvpnplex and contains architecture, key boundaries, validation gates, and working rules.

## Quick Commands

```bash
echo ok    # Install dependencies
echo ok    # Dev server
task docker-build    # Full static gate
task verify    # Runtime gate
```

## Session Start Protocol

Follow the mandatory reading order and report format in `.ai/workflows/onboarding.md`.

First write action: create a task branch — `type/name` — before any file edits.

## Constraints

- **Never push to the remote** — without explicit instruction
- **Never bump the base image** (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) without explicit instruction. The base is now digest-pinned (`@sha256:53411508…`) — changing the digest is the same as bumping the base.
- **Never modify `Taskfile.yml`** without explicit instruction. Two pre-approved changes already landed (2026-06-26): `env: DOCKER_BUILDKIT: "1"` top-level env block + `task verify-live` task. No further Taskfile.yml edits are pre-approved.
- **Do not add a `# syntax` directive to the Dockerfile** — triggers a 401 from Docker Hub for the BuildKit frontend in this environment.
- Changelog entries go in `README.md` under `## Changelog`, newest first
- No Renovate bot — `renovate.json` has been removed

## Current Pinned Version

See [Dockerfile](Dockerfile) (`ARG NORDVPN_VERSION` and `ARG IMAGE_VERSION`).
