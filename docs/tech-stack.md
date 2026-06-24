# Tech Stack

Technology choices, rationale, and dependency versions for **fredplex/nordvpn**.

**Last Updated**: 2026-06-24

---

## Overview

**Core stack**: Ubuntu Noble base (linuxserver.io), NordVPN Linux client, WireGuard/NordLynx, s6-overlay process supervisor, Taskfile task runner, Docker, GitHub Actions

---

## Container Layer

| Technology | Version | Role | Rationale |
|------------|---------|------|-----------|
| `ghcr.io/linuxserver/baseimage-ubuntu:noble` | noble (Ubuntu 24.04) | Base image | Brings s6-overlay, well-maintained, sensible defaults |
| NordVPN Linux client | 5.1.0 (pinned) | VPN client | Official Debian package from NordVPN's own repo |
| WireGuard / NordLynx | included with NordVPN | VPN protocol (default) | Lower latency than OpenVPN |
| OpenVPN | included with NordVPN | VPN protocol (alt) | Fallback; set via `TECHNOLOGY=OpenVPN` |
| iptables / iptables-legacy | system | Kill switch | Drop all OUTPUT traffic before VPN connects |
| s6-overlay | bundled in base image | Process supervisor | Manages init sequence and long-running services |

---

## Build Tooling

| Tool | Version | Role | Notes |
|------|---------|------|-------|
| Docker / Docker Desktop | 24+ | Build and run images | Local builds and smoke tests |
| Taskfile (`task`) | 3.x | Local task runner | `task docker-build`, `task verify`, `task release`, etc. |
| Bash | system | `scripts/*.sh` | bump.sh, check-version.sh, verify.sh |
| curl | system | Package verification + version check | Used in check-version.sh and bump.sh |
| sed / grep | system | File editing in bump.sh | Edits Dockerfile, README.md, CLAUDE.md |

---

## CI/CD

| Technology | Role | Trigger |
|------------|------|---------|
| GitHub Actions | PR validation, version detection, publish | PR → main, weekly cron, tag push |
| `docker/build-push-action@v6` | Build + push to Docker Hub | publish.yml |
| `docker/login-action@v3` | Docker Hub authentication | publish.yml |
| `docker/setup-buildx-action@v3` | Multi-platform build setup | publish.yml |
| `peter-evans/create-pull-request@v6` | Open draft PR from Actions | check-nordvpn-release.yml |

---

## Testing

| Technology | Role |
|------------|------|
| `scripts/verify.sh` / `task verify` | Smoke test: IMAGE_VERSION ENV, nordvpn --version, iptables kill-switch, nordvpnd socket |
| `docker inspect` | Stateless version check (no container startup needed) |
| `docker run --rm` | One-shot checks (nordvpn --version, iptables policy) |

No unit test framework — the project is shell scripts + a Dockerfile. The smoke test suite covers the critical paths.

---

## Key Version Constraints

- **NordVPN version** is pinned in `Dockerfile ARG NORDVPN_VERSION`. Do not bump without verifying the `.deb` exists at `https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/`.
- **Base image** (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) must not be bumped without explicit owner instruction.
- **No Renovate** — `renovate.json` has been removed. No automated dependency PRs.

---

## Upgrade History

| Date | Change | Reason |
|------|--------|--------|
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
