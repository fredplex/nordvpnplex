<!-- prime: version=3.0.0 template=docs/tech-stack.md date=2026-07-17 -->
# Tech Stack

Technology choices, rationale, and dependency versions for **fredplex/nordvpn**.

**Last Updated**: 2026-06-27

---

## Overview

**Core stack**: Ubuntu Noble base (linuxserver.io), NordVPN Linux client, WireGuard/NordLynx, s6-overlay process supervisor, Taskfile task runner, Docker, GitHub Actions

---

## Application Layer

| Technology | Version | Role | Rationale |
|------------|---------|------|-----------|
| `ghcr.io/linuxserver/baseimage-ubuntu:noble` | digest-pinned — see `ARG BASE_DIGEST` in the Dockerfile | Base image | Brings s6-overlay, well-maintained, sensible defaults; digest pin enforces the "no silent base bump" constraint |
| NordVPN Linux client | 5.1.0 (pinned) | VPN client | Official Debian package from NordVPN's own repo |
| WireGuard / NordLynx | included with NordVPN | VPN protocol (default) | Lower latency than OpenVPN |
| OpenVPN | included with NordVPN | VPN protocol (alt) | Fallback; set via `TECHNOLOGY=OpenVPN` |
| iptables / iptables-legacy | explicitly installed | Kill switch | Drop all OUTPUT traffic before VPN connects; made explicit in `apt-get install` after removing the `nordvpn-release` metapackage |
| wireguard-tools | explicitly installed | NordLynx userspace tools | Sufficient for NordLynx (`wireguard` metapackage unnecessary; NordVPN `.deb` brings kernel support) |
| s6-overlay | bundled in base image | Process supervisor | Manages init sequence and long-running services |
| curl | explicitly installed | Runtime watchdog + build-time repo fetch | `nord_watch` polls `CHECK_CONNECTION_URL` via `curl -Is`; also used at build time to fetch the NordVPN `.deb` |

---

## Infrastructure & Deployment

| Technology | Role | Notes |
|------------|------|-------|
| GitHub Actions | PR validation, version detection, base-image check, publish | PR → main, daily/monthly cron, tag push |
| `docker/build-push-action@v6` | Build + push to Docker Hub | publish.yml |
| `docker/login-action@v3` | Docker Hub authentication | publish.yml |
| `docker/setup-buildx-action@v3` | Multi-platform build setup | publish.yml |
| `peter-evans/create-pull-request@v6` | Open draft PR from Actions | check-nordvpn-release.yml, check-base-image.yml |

---

## Testing

| Technology | Role |
|------------|------|
| `scripts/verify.sh` / `task verify` | Smoke test (credentialless): IMAGE_VERSION ENV, nordvpn --version, iptables kill-switch, nordvpnd socket. MSYS/Git-Bash safe (`MSYS_NO_PATHCONV=1`). |
| `scripts/connect-test.sh` / `task verify-live` | Real-token connect + Spain egress test. Mandatory pre-release gate — `task verify` cannot validate tunnel connectivity. Reads token from file; token never appears in args, env dumps, or logs. |
| `docker inspect` | Stateless version check (no container startup needed) |
| `docker run --rm` | One-shot checks (nordvpn --version, iptables policy) |

No unit test framework — the project is shell scripts + a Dockerfile. The two-tier smoke test suite covers the critical paths: credentialless structure checks (`task verify`) + real tunnel connectivity (`task verify-live`).

---

## Development Tooling

| Tool | Version | Role |
|------|---------|------|
| Docker / Docker Desktop | 24+ | Build and run images; local builds and smoke tests |
| BuildKit (`DOCKER_BUILDKIT=1`) | bundled with Docker 18.09+ | Required for `COPY --chmod=0755`; `Taskfile.yml` sets `env: DOCKER_BUILDKIT: "1"` globally; CI uses `docker/setup-buildx-action` |
| Taskfile (`task`) | 3.x | Local task runner: `task docker-build`, `task verify`, `task verify-live`, `task release`, etc. |
| Bash | system | `scripts/*.sh` — bump.sh, check-version.sh, verify.sh, connect-test.sh, check-base-image.sh |
| curl | system | Package verification + version check — used in check-version.sh and bump.sh |
| sed / grep | system | File editing in bump.sh — edits Dockerfile, README.md |

---

## Key Version Constraints

- **NordVPN version** is pinned in `Dockerfile ARG NORDVPN_VERSION`. Do not bump without verifying the `.deb` exists at `https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/`.
- **Base image** (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) is **digest-pinned** (`ARG BASE_DIGEST` in the Dockerfile). Do not change the digest without explicit owner instruction. A monthly base-refresh cadence (check-base-image.yml) automates detection, dev testing, and draft PRs.
- **No Renovate** — `renovate.json` has been removed. No automated dependency PRs.

---

## Upgrade History

| Date | Change | Reason |
|------|--------|--------|
| 2026-06-27 | Base image refresh cadence implemented (check-base-image.sh + check-base-image.yml + task check-base) | Automate monthly digest detection, dev builds, and draft PRs |
| 2026-06-26 | Dockerfile optimization (Phases 0–5) | Security hardening, reproducibility, health reporting |
| 2026-06-26 | Base image digest-pinned (`@sha256:53411508…`) | Enforce no-silent-base-bump constraint |
| 2026-06-26 | `wireguard` → `wireguard-tools`; `iptables` made explicit | Package rationalisation; F5/F6 findings |
| 2026-06-26 | `COPY --chmod=0755`; `DOCKER_BUILDKIT=1` in Taskfile | Replace fragile chmod block; deterministic on Windows + Linux |
| 2026-06-26 | HEALTHCHECK added | Surface real tunnel state to Docker/Unraid |
| 2026-06-26 | `task verify-live` + `scripts/connect-test.sh` | Two-tier testing: credentialless + real NordLynx egress gate |
| 2026-06-24 | NordVPN 5.1.0, Image 5.5.1 | NordVPN client update (auto checker → PR #4) |
| 2026-03-16 | NordVPN 4.5.0, Image 5.5.0 | NordVPN client update |
| 2026-06-22 | `/.version` → `ENV IMAGE_VERSION` + OCI labels | Fix append bug, add standard queryable version |
| 2026-06-22 | Added Taskfile tasks: verify, check-version, bump, release | Reduce manual toil |
| 2026-06-22 | Added GitHub Actions: build-validate, publish, check-nordvpn-release | Automated detection + CI validation |

---

## Deprecated / Removed

| Technology | Replaced by | Reason |
|------------|-------------|--------|
| `/.version` file in container | `ENV IMAGE_VERSION` + OCI label | Append bug; non-standard; not externally queryable |
| `rootfs/usr/bin/version_message` | `cont-init.d/00-version` | Belongs in init sequence, not CMD chain |
| `renovate.json` | (removed entirely) | Owner does not want automated dependency PRs |
| `wireguard` metapackage | `wireguard-tools` | Metapackage unnecessary; NordVPN `.deb` brings kernel support; `wireguard-tools` is sufficient for NordLynx |
| `net-tools` | (removed) | No rootfs script uses it; dead weight |
| `iputils-ping` | (removed) | No rootfs script uses it; dead weight |
| `libc6` | (removed) | Redundant — already in Ubuntu Noble base |
| 10-line `chmod` block in Dockerfile | `COPY --chmod=0755 rootfs /` | Fragile, NTFS-opaque; replaced by BuildKit copy-time permission stamp |
