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
