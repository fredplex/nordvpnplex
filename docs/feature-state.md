<!-- prime: version=3.0.0 template=docs/feature-state.md date=2026-06-30 -->
# Feature State

Authoritative inventory of all features in **fredplex/nordvpn**.

**Last Updated**: 2026-06-27

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
| Docker HEALTHCHECK | ✅ Implemented | `--interval=60s --start-period=45s`; surfaces tunnel state to Docker engine and Unraid dashboard; transitions `starting → healthy` in ~5s with NordLynx |
| Base image digest pin | ✅ Implemented | `noble@sha256:53411508…` — prevents silent base image changes; enforces the no-base-bump constraint |

---

## Build & Release Tooling

| Feature | Status | Notes |
|---------|--------|-------|
| `task docker-build` | ✅ Implemented | Builds local test image tagged with git hash |
| `task verify` (smoke tests) | ✅ Implemented | 3 stateless checks (uses entrypoint override) + 1 runtime daemon socket check; MSYS/Git-Bash safe on Windows (no WSL2 required for verify) |
| `task verify-live` (real-token gate) | ✅ Implemented | Real NordVPN token + Spain egress test; reads token from file; mandatory pre-release gate; `scripts/connect-test.sh` |
| `task check-version` | ✅ Implemented | Scrapes NordVPN Debian repo; shows latest 5 versions vs pinned |
| `task check-base` | ✅ Implemented | Checks base image for newer digest via `docker buildx imagetools inspect`; `scripts/check-base-image.sh` |
| `task bump` | ✅ Implemented | Single-command version bump; verifies package exists first |
| `task release` | ✅ Implemented | Creates annotated git tag + pushes (retained as local release fallback) |
| GitHub Actions: build-validate | ✅ Implemented | `docker build` on PR → main; no push |
| GitHub Actions: publish | ✅ Implemented | PR merge (main push), tag push, or manual: builds, tests, publishes to Docker Hub, then creates a GitHub Release (tag + native notification) |
| GitHub Actions: check-nordvpn-release | ✅ Implemented | Daily cron: check repo, auto-run dev build & verify, open draft PR if successful |
| GitHub Actions: check-base-image | ✅ Implemented | Monthly cron (1st at 09:00 UTC): check base digest, open draft PR + trigger dev build if changed |
| `task dev-build` | ✅ Implemented | Builds `:dev` + `:dev-<hash>`; optional NORDVPN_VERSION override |
| `task dev-push` | ✅ Implemented | Pushes `:dev` + `:dev-<hash>` to Docker Hub |
| `task dev-latest` | ✅ Implemented | Auto-discovers newest NordVPN version + builds dev image |
| `task dev-clean` | ✅ Implemented | Removes local `:dev` and `:dev-*` images |
| GitHub Actions: publish-dev | ✅ Implemented | Manual/Auto trigger: builds, tests, pushes `:dev`, `:dev-<sha>`, `:dev-<version>` |
| Release notifications (native) | ✅ Implemented | `publish.yml` creates a GitHub Release on success (emails repo watchers); GitHub Actions emails the owner on workflow failure. No SMTP, no secrets — uses `GITHUB_TOKEN`. One-time: Watch → Releases |

---

## Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| README.md mirrors upstream bubuntux/nordvpn | Low | Open — Tier 3 deferred (see below) |

---

## Recently Shipped

- **Base image refresh cadence (Phases A–D)** — 2026-06-27 (`chore/base-image-refresh-plan`):
  - `scripts/check-base-image.sh` — local digest checker using `docker buildx imagetools inspect`
  - `.github/workflows/check-base-image.yml` — monthly cron (1st at 09:00 UTC), auto dev build + draft PR
  - `task check-base` added to Taskfile (explicitly approved)
  - Documentation updated: `.ai/current.md`, `active.md`, `AGENTS.md`, `docs/build-and-publish.md`, `README.md`, `user-guide.md`
- **Dockerfile optimization (Phases 0–5)** — 2026-06-26 (`chore/dockerfile-optimization`):
  - Base image digest-pinned (`noble@sha256:53411508…`)
  - `wireguard` → `wireguard-tools`; `iptables` + `curl` made explicit; `net-tools`, `iputils-ping`, `libc6` removed
  - `COPY --chmod=0755` replaces 10-line chmod block; `DOCKER_BUILDKIT=1` enforced in Taskfile
  - HEALTHCHECK added — surfaces tunnel state to Docker/Unraid
  - `task verify-live` + `scripts/connect-test.sh` formalised as mandatory pre-release gate
  - `scripts/verify.sh` now MSYS/Git-Bash safe (no WSL2 required for verify)
  - curl bootstrap fetch hardened (`--proto '=https' --tlsv1.2`)
  - Shebangs fixed: `nord_config` (`with-contenv /bin/bash`), `nord_watch` (`/bin/bash`)
  - `.dockerignore` expanded to exclude `.ai`, `docs`, `scripts`, `Taskfile.yml`, etc.
- Native release notifications — 2026-06-24 (`publish.yml` publishes a GitHub Release on success → emails repo watchers; native GitHub Actions emails on failure; no SMTP, no secrets)
- NordVPN 5.1.0 release — 2026-06-24 (image 5.5.1; `:latest` + `:5.5.1` on Docker Hub)
- Unified release pipeline — 2026-06-23 (GHA-centric release on PR merge, daily cron version checker + dev build, manual dispatch, verify script entrypoint override, LF normalisation)
- Version mechanism refactor — 2026-06-22 (removed `/.version`, added `ENV IMAGE_VERSION` + OCI labels, moved banner to `cont-init.d/00-version`)
- Build/publish workflow — 2026-06-22 (added scripts/bump.sh, check-version.sh, verify.sh; Taskfile tasks; 3 GitHub Actions)

---

## Deferred Features

These have been explicitly considered and deferred. Do not implement without re-approval.

- **README.md project-specific rewrite (R8)** — Current README mirrors upstream `bubuntux/nordvpn` project. Needs a project-specific README with actual Changelog section. Deferred as Tier 3.
- **Auto-generated Changelog (R9)** — Considered but deferred along with README rewrite.
- **Remove `apt-get upgrade`** — Revisit after first few monthly base image refreshes have run successfully. Deferred to evaluate reproducibility tradeoff.
