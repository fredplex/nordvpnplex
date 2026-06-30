<!-- prime: version=3.0.0 template=.ai/memory/project-state.md date=2026-06-30 -->
# Project State

Current product posture and approved scope for **nordvpn**.

**Last Updated**: 2026-06-27

---

## Product Identity

**fredplex/nordvpn** — Custom Docker image packaging the official NordVPN Linux client for use as a VPN gateway on Unraid NAS systems. Other containers route their traffic through it via `--net=container:vpn`.

**Tech stack**: Ubuntu Noble (linuxserver.io base), NordVPN Linux client (Debian pkg), WireGuard/NordLynx, s6-overlay, Taskfile, Docker, GitHub Actions

**Product feel**:
- Reliable, low-maintenance VPN gateway — starts cleanly, fails safe (kill switch), reconnects automatically
- Owner-controlled release cadence — gated by human PR merge, with GHA automating the build, test, tag, and publish steps

**This is not**:
- A fully automated pipeline without review (human PR review & merge is the release gate)
- A web app or API — there is no Node.js, no npm, no frontend

---

## Current Operational Phase

**Phase**: Stable maintenance — update NordVPN client version as new packages release, verify, publish. No active feature development.

---

## Implemented Features

See `docs/feature-state.md` for the authoritative feature inventory.

Key areas:
- VPN gateway with iptables kill switch (`00-firewall`)
- WireGuard/NordLynx default, OpenVPN fallback
- Meshnet support (peer routing and LAN discovery)
- Watchdog reconnection (`nord_watch` polling)
- Automated version detection daily + auto dev build/test & draft PR
- Base image refresh check monthly + auto dev build & draft PR
- GHA release CD pipeline triggered by PR merges
- Smoke-test suite (uses entrypoint override for stateless checks)

---

## Approved Mutable Scope

### Currently Approved Mutations

- `version bump` — via `task bump NORDVPN_VERSION=x IMAGE_VERSION=y` (edits Dockerfile, README.md, CLAUDE.md only; `.ai/current.md` is hand-maintained — bump.sh no longer writes it, 2026-06-24)
- `rootfs/ script edits` — editing cont-init.d, services.d, or usr/bin scripts
- `documentation updates` — AGENTS.md, CLAUDE.md, docs/, .ai/
- `GitHub Actions workflow edits` — when explicitly requested by owner

### All Mutable Actions Must Be

**For file/script mutations**:
- Confirmed with owner before touching any version-sensitive file
- Shown as a diff before applying (wait for approval)
- LF line endings preserved in all `rootfs/` files

**Publish gate (always human)**:
- Owner runs `task docker-build` locally
- Owner runs `task verify` locally
- Owner runs `task release` to tag and push

---

## Forbidden Unless Separately Approved

- `git push` to remote (owner pushes manually)
- Base image bump (`ghcr.io/linuxserver/baseimage-ubuntu:noble`)
- Modifying `Taskfile.yml`
- Auto-merging any PR
- Publishing Docker images without a human-created git tag

See `.ai/rules/mutation-rules.md` for the governance process.

---

## Architecture Posture

- Kill switch fires before VPN connects — no traffic leaks on startup failure
- s6-overlay manages process lifecycle (cont-init.d → services.d → CMD)
- Version stored as `ENV IMAGE_VERSION` and OCI label — queryable without running the container
- Single maintainer; all publish actions gated by owner approval

See `.ai/memory/architecture-decisions.md` for the detailed model.

---

## Testing

- **Unit tests**: None
- **Smoke tests**: `task verify` — 4 checks (entrypoint overridden for stateless checks to prevent capabilities/HOME errors)
- **CI/CD**: GitHub Actions — `build-validate.yml` (on PRs); `publish.yml` (on PR merges to main / tags / manual dispatch)

---

## Reference Documents

- Feature state: `docs/feature-state.md`
- Architecture: `docs/architecture.md`
- Product vision: `docs/project-rules.md`
- Build & publish workflow: `docs/build-and-publish.md`
