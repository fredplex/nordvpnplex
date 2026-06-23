# Architecture

Core architecture philosophy, layer discipline, and design decisions for **fredplex/nordvpn**.

**Working copy**: `.ai/memory/architecture-decisions.md`

---

## Overview

`fredplex/nordvpn` is a **Docker container build project**. It packages the official NordVPN Linux client into a Docker image for use as a VPN gateway on Unraid NAS systems. This is not a web app or API — there is no Node.js, no database, no REST surface.

---

## Data Flow

### Release workflow
```
NordVPN Debian repo ──► Weekly GitHub Action ──► Draft PR (human reviews + merges)
                                                        │
                                               git pull (local)
                                                        │
                                            task docker-build (local)
                                                        │
                                             task verify (local, 4 checks)
                                                        │
                                             task release (tag + push)
                                                        │
                                       GitHub Action: publish.yml
                                                        │
                                                  Docker Hub
                                         fredplex/nordvpn:latest
                                         fredplex/nordvpn:<IMAGE_VERSION>
```

### Container startup sequence
```
Docker starts container
        │
s6-overlay takes over as PID 1
        │
cont-init.d (in filename order):
  00-firewall   → iptables OUTPUT policy = DROP (kill switch — no traffic leaks)
  00-version    → print IMAGE_VERSION banner to logs
  10-tun        → create /dev/net/tun if missing
  20-inet       → IPv4 interface setup
  20-inet6      → IPv6 interface setup
  30-route      → IPv4 routing table (local network access)
  30-route6     → IPv6 routing table
  40-allowlist  → punch iptables holes for ALLOW_LIST domains
        │
services.d/nordvpn/run starts nordvpnd daemon (long-running, s6 restarts if it exits)
        │
CMD: nord_login → nord_config → nord_connect → nord_watch
```

The kill switch fires **first** — traffic is blocked before the VPN establishes. If the VPN fails to connect, traffic stays blocked.

---

## Layer Responsibilities

### Build layer (Dockerfile + Taskfile)
- Defines what goes into the image: base OS, NordVPN package version, rootfs scripts
- Sets `ENV IMAGE_VERSION` and OCI labels at build time
- `task docker-build` injects the git hash as IMAGE_VERSION (test builds)
- `task release` + GitHub publish workflow injects the semver tag (published images)

### Init layer (cont-init.d)
- Runs once at container startup, in filename order, before any services start
- Must exit cleanly — a non-zero exit halts the entire init chain
- No sleep loops, no background processes

### Service layer (services.d/nordvpn)
- Long-running nordvpnd daemon managed by s6
- s6 restarts the service automatically if it exits
- `s6-svc -wR -t /var/run/s6/services/nordvpn` sends a controlled restart (used by `nord_watch`)

### Application layer (CMD scripts: usr/bin/)
- `nord_login` — authenticates via TOKEN / TOKENFILE env var
- `nord_config` — applies TECHNOLOGY, DNS, FIREWALL, MESHNET, LAN_DISCOVERY, etc.
- `nord_connect` — connects with exponential backoff retry; runs PRE/POST_CONNECT hooks
- `nord_watch` — polls CHECK_CONNECTION_URL; triggers s6 restart on failure

---

## Layer Discipline

| Layer | Can reference | Cannot reference |
|-------|--------------|-----------------|
| cont-init.d scripts | ENV vars, /dev, network interfaces | services.d state (services haven't started yet) |
| services.d/nordvpn | nordvpnd binary | CMD scripts (CMD runs after services start) |
| CMD scripts (usr/bin) | nordvpn CLI, ENV vars, s6-svc | cont-init.d (already completed) |

---

## Key Architectural Decisions

### OCI Labels + ENV for version

**Context**: Need to know what version is in the container without starting it.
**Decision**: `ENV IMAGE_VERSION` + `LABEL org.opencontainers.image.version` instead of `/.version` file.
**Rationale**: OCI labels are queryable externally via `docker inspect`, visible on Docker Hub, standard. No file to maintain, no append-bug risk.
**Consequences**: Local test builds show the git hash (not semver) as IMAGE_VERSION — this is expected.

### Kill switch fires before VPN (00-firewall)

**Context**: If the VPN fails to start, traffic must not leak through the host network.
**Decision**: `cont-init.d/00-firewall` sets iptables OUTPUT policy to DROP before nordvpnd starts.
**Rationale**: Fail-safe by default. Users rely on this container as their network gateway — a VPN that silently fails open is worse than one that blocks all traffic.
**Consequences**: If 00-firewall fails, s6 halts init and the container won't start. This is intentional.

### Human-in-the-loop publish gate

**Context**: Single maintainer; broken published images affect Unraid users immediately.
**Decision**: No automated image push. Owner must build locally, verify, and run `task release`.
**Rationale**: The weekly action creates a draft PR for review. `task release` is the manual publish trigger. Automated publish would remove the owner's ability to catch build-time failures.
**Consequences**: Releases are slower but safer. Agent never pushes to remote.

---

## Real-Time / Events

- `nord_watch` polls `CHECK_CONNECTION_URL` (default: `www.google.com`) every `CHECK_CONNECTION_INTERVAL` seconds (default: 300s).
- On failure, sends an s6 restart signal to the nordvpn service.

---

## Operational Logging

- `cont-init.d/00-version` prints the IMAGE_VERSION banner early in startup logs.
- nordvpnd daemon logs to stdout/stderr (captured by s6 and Docker).
- No structured JSON logging — plain text to Docker's log driver.

---

## Known Constraints and Gotchas

- **CRLF line endings in rootfs/**: Shell scripts with CRLF fail with `bad interpreter`. `.gitattributes` enforces LF on checkout; verify when creating new scripts on Windows.
- **`task docker-build` injects git hash**: The local image has a hash in IMAGE_VERSION, not the semver. `task verify` confirms the hash — this is correct behavior.
- **No `/.version` file**: Older references to `/.version` in the container root are stale. Version is now `ENV IMAGE_VERSION` only.
- **nordvpnd socket check takes 12s**: The verify script waits for the daemon to start before checking. Expected.
- **`task release` requires a clean working tree and non-duplicate tag**: Always commit before running.
