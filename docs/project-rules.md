# Project Rules

Product vision, boundaries, and governance for **fredplex/nordvpn**.

**Working copy**: `.ai/memory/project-state.md`, `.ai/rules/`

---

## Product Vision

`fredplex/nordvpn` is a minimal, reliable Docker image that packages the official NordVPN Linux client for use as a VPN gateway on Unraid NAS systems. The container acts as a network proxy — other containers route their traffic through it via `--net=container:vpn`. The owner is the sole maintainer and the primary user. Releases are infrequent and deliberate, always triggered by a new NordVPN client version.

---

## What We Build

✅ **In scope**:
- Packaging the official NordVPN Linux client in a Docker image
- iptables kill switch (block all traffic before VPN connects)
- Support for NordLynx (WireGuard) and OpenVPN
- Meshnet, DNS override, port allowlist, and LAN discovery configuration
- Watchdog reconnection on connection loss
- Automated version detection (weekly GitHub Action → draft PR)
- Local build and smoke-test tooling (Taskfile + scripts)
- Human-in-the-loop publish workflow (owner reviews, builds locally, verifies, then tags)

🚫 **Out of scope** (requires explicit governance to add):
- Web UI or management interface
- Multi-user or multi-account support
- Automated image publish without owner review
- Support for VPN providers other than NordVPN
- Persistent data volumes or stateful configuration

---

## Approved Mutations

The following state-changing operations are currently approved:

- **Version bumps** — `task bump NORDVPN_VERSION=x IMAGE_VERSION=y`; edits Dockerfile, README.md, CLAUDE.md, .ai/current.md; requires owner confirmation of both version strings first
- **rootfs/ script edits** — cont-init.d, services.d, usr/bin; show diff before applying
- **Documentation updates** — AGENTS.md, CLAUDE.md, docs/, .ai/ files
- **GitHub Actions workflow edits** — when explicitly requested by owner

See `.ai/rules/mutation-rules.md` for the full approval process.

---

## Product Boundaries — Invariants

These constraints must hold at all times:

- **Kill switch fires before VPN**: iptables OUTPUT policy must be DROP before nordvpnd starts
- **No automated image push**: Docker Hub publish always requires a human-created git tag via `task release`
- **NordVPN version is pinned**: `ARG NORDVPN_VERSION` in Dockerfile must match a real `.deb` in the official repo
- **LF line endings in rootfs/**: CRLF causes `bad interpreter` failures — `.gitattributes` enforces this
- **Single maintainer gate**: no PR merges, no tag pushes, no publishes without owner action

---

## Governance Process for Changes

1. Describe the proposed change — scope, motivation, approach
2. If it involves a mutation, pass the mutation approval gate (see `.ai/rules/mutation-rules.md`)
3. Write an implementation plan in `.ai/plans/<name>.md`
4. Get explicit human approval before making any changes
5. Implement, validate (`task docker-build` + `task verify`)
6. Update `.ai/current.md` and `docs/feature-state.md`

---

## Technology Constraints

- **No Node.js / npm** — this is a Docker container build project; do not add any npm scripts, package.json, or Node.js tooling
- **No Renovate** — `renovate.json` has been removed; do not re-add it
- **No automated dependency bumps** — base image and NordVPN version are bumped manually and deliberately
- **Must work on Docker Desktop (Windows/Mac) and Docker CE (Linux)** — `task docker-build` must succeed on the owner's Windows machine
