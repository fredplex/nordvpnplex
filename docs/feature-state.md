# Feature State

Authoritative inventory of all features in **fredplex/nordvpn**.

**Last Updated**: 2026-06-23

**Working copy**: `.ai/memory/project-state.md`

---

## How to Read This Document

- ✅ **Implemented** — shipped and working
- 🚧 **In Progress** — currently being built
- 📋 **Planned** — approved for future implementation
- ❌ **Deferred** — considered but not approved

---

## Core Container Features

| Feature | Status | Notes |
|---------|--------|-------|
| NordVPN Linux client (pinned) | ✅ Implemented | Installed via official Debian repo; version pinned in Dockerfile ARG |
| iptables kill switch | ✅ Implemented | `cont-init.d/00-firewall` — OUTPUT policy DROP before VPN connects |
| WireGuard / NordLynx | ✅ Implemented | Default protocol; set via `TECHNOLOGY=NordLynx` |
| OpenVPN | ✅ Implemented | Fallback protocol; set via `TECHNOLOGY=OpenVPN` |
| Meshnet support | ✅ Implemented | `MESHNET`, `ALLOWLOCAL`, `ALLOWROUTE` env vars |
| DNS override | ✅ Implemented | `DNS` env var (up to 3 servers) |
| CyberSec | ✅ Implemented | `CYBER_SEC` env var; disabled when DNS is set |
| Firewall toggle | ✅ Implemented | `FIREWALL` env var |
| Obfuscation | ✅ Implemented | `OBFUSCATE` env var (OpenVPN only) |
| Protocol selection | ✅ Implemented | `PROTOCOL` env var (OpenVPN only: TCP/UDP) |
| LAN discovery | ✅ Implemented | `LAN_DISCOVERY` env var |
| Domain allowlist | ✅ Implemented | `ALLOW_LIST` env var (and legacy `WHITELIST` alias) |
| Local network routing | ✅ Implemented | `NET_LOCAL` / `NET6_LOCAL` env vars |
| Port allowlist | ✅ Implemented | `PORTS` / `PORT_RANGE` env vars |
| Pre/post connect hooks | ✅ Implemented | `PRE_CONNECT` / `POST_CONNECT` env vars |
| Watchdog reconnection | ✅ Implemented | `nord_watch` polls `CHECK_CONNECTION_URL` every `CHECK_CONNECTION_INTERVAL` seconds |
| Token auth (plain) | ✅ Implemented | `TOKEN` env var |
| Token auth (docker secrets) | ✅ Implemented | `TOKENFILE` env var — path to a file containing the token |
| Version banner at startup | ✅ Implemented | `cont-init.d/00-version` prints `IMAGE_VERSION` |
| OCI image labels | ✅ Implemented | `org.opencontainers.image.*` labels queryable via `docker inspect` |
| `ENV IMAGE_VERSION` | ✅ Implemented | Available inside container at runtime; set at build time |

---

## Build & Release Tooling

| Feature | Status | Notes |
|---------|--------|-------|
| `task docker-build` | ✅ Implemented | Builds local test image tagged with git hash |
| `task verify` (smoke tests) | ✅ Implemented | 4 checks: ENV, nordvpn version, iptables, daemon socket |
| `task check-version` | ✅ Implemented | Scrapes NordVPN Debian repo; shows latest 5 versions vs pinned |
| `task bump` | ✅ Implemented | Single-command version bump; verifies package exists first |
| `task release` | ✅ Implemented | Creates annotated git tag + pushes; triggers GitHub publish workflow |
| GitHub Actions: build-validate | ✅ Implemented | `docker build` on PR → main; no push |
| GitHub Actions: publish | ✅ Implemented | Tag push → build + push `:latest` + `:<tag>` to Docker Hub |
| GitHub Actions: check-nordvpn-release | ✅ Implemented | Weekly cron: detect new NordVPN version, open draft PR |
| `task dev-build` | ✅ Implemented | Builds `:dev` + `:dev-<hash>`; optional NORDVPN_VERSION override |
| `task dev-push` | ✅ Implemented | Pushes `:dev` + `:dev-<hash>` to Docker Hub |
| `task dev-latest` | ✅ Implemented | Auto-discovers newest NordVPN version + builds dev image |
| `task dev-clean` | ✅ Implemented | Removes local `:dev` and `:dev-*` images |
| GitHub Actions: publish-dev | ✅ Implemented | Manual trigger; builds, smoke-tests, pushes `:dev` + `:dev-<sha>` |

---

## Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| README.md mirrors upstream bubuntux/nordvpn | Low | Open — Tier 3 deferred (see below) |

---

## Recently Shipped

- Version mechanism refactor — 2026-06-22 (removed `/.version`, added `ENV IMAGE_VERSION` + OCI labels, moved banner to `cont-init.d/00-version`)
- Build/publish workflow — 2026-06-22 (added scripts/bump.sh, check-version.sh, verify.sh; Taskfile tasks; 3 GitHub Actions)
- AI agent docs — 2026-06-23 (prime-ai-docs.mjs scaffold + nordvpn content merge)

---

## Deferred Features

These have been explicitly considered and deferred. Do not implement without re-approval.

- **README.md project-specific rewrite (R8)** — Current README mirrors upstream `bubuntux/nordvpn` project. Needs a project-specific README with actual Changelog section. Deferred as Tier 3.
- **Auto-generated Changelog (R9)** — Considered but deferred along with README rewrite.
