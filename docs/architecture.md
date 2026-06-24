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
NordVPN Debian repo ──► Daily GitHub Action (checks versions)
                                │
                        (If update found)
                                │
                                ▼
                       GHA auto dev-build
                                │
                       (Runs smoke tests)
                                │
                                ▼
                        GHA opens draft PR ──► Owner reviews & merges PR
                                                        │
                                                        ▼
                                            GHA publish.yml (runs CD)
                                                        │
                                            (Runs stateless tests)
                                                        ├──────────────────────┐
                                                        │                      │
                                                        ▼                      ▼
                                                    Docker Hub          GitHub Release
                                              :latest, :<version>     (tag + notify email)
```

**Alternative release paths**:
- **Manual Dev Publish**: Owner triggers GHA `Publish Dev to Docker Hub` with optional version override. Pushes `:dev`, `:dev-<sha>`, and `:dev-<version>`.
- **Manual Prod Publish**: Owner triggers GHA `Publish to Docker Hub` manually with version inputs. Runs tests and publishes.
- **Local Fallback**: Owner bumps versions using `task bump`, builds/verifies locally, and runs `task release` to tag and trigger GHA CD.

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
**Decision**: Human review of the auto-created draft PR is the final release gate. GitHub Actions automates the build, test, tag, and publish steps *after* approval.
**Rationale**: GHA checks versions daily, auto-builds & tests a dev image, and opens a draft PR only if those tests pass. This provides verification data *before* the owner merges. Merging the PR then triggers GHA to run CD, performing a final smoke test check before pushing to Docker Hub.
**Consequences**: Pushes are fully automated, but still completely gated by the owner merging the PR. Manually tagging or running local `task release` is no longer the primary path (though retained as a fallback).

### Release notifications — GitHub-native

**Context**: A successful production release used to be silent — `publish.yml` ended by pushing a bare git tag, which notifies no one. The owner only learned a release happened by checking the Actions tab or Docker Hub.
**Decision**: Use **GitHub-native** signals only — no SMTP, no third-party action, no secrets:
- **Success** → `publish.yml` finishes with `gh release create` (auth: built-in `GITHUB_TOKEN`), which creates the tag **and** a GitHub Release. Publishing the Release triggers GitHub's native notification email to repo watchers.
- **Failure** → GitHub's built-in **Actions** notifications email the run's actor / scheduled-workflow editor (Settings → Notifications → Actions).
**Rationale**: Zero secret management (no SMTP/app password), no third-party action to trust or pin, and a real Releases page as a side benefit (version history + notes). Failures were already covered natively; only success needed a signal.
**Consequences**:
- The owner must opt in once: **Watch → Custom → Releases** to receive the success emails.
- `gh release create` makes a **lightweight** tag (the previous step made an annotated tag); the release notes carry the equivalent context.
- The step runs on both the merge-to-`main` and manual `task release` paths (`gh release view` dedups so re-runs don't error).

**Roles for this flow**:

| Actor | Responsibility |
|-------|----------------|
| **AI agent** | Implements the workflow + docs on a branch; shows diffs; never merges/pushes without owner approval. Does not receive or act on notifications. |
| **Human (owner)** | One-time: enable Watch → Releases + confirm Actions failure emails. Ongoing: receives success/failure emails and decides next action; remains the release gate. |
| **GitHub** | Runs `publish.yml`; `gh release create` makes the tag + Release; GitHub emails watchers on release publish and the actor/owner on workflow failure. No third-party service, no secrets. |

---

## Real-Time / Events

- `nord_watch` polls `CHECK_CONNECTION_URL` (default: `www.google.com`) every `CHECK_CONNECTION_INTERVAL` seconds (default: 300s).
- On failure, sends an s6 restart signal to the nordvpn service.

---

## Versioning Design

The project separates NordVPN's client application version from the container project's release version. These versions manifest across different lifecycle stages (build, test, deploy, run).

### 1. Version Identifiers

| Variable | Scope | Description | Source of Truth |
|---|---|---|---|
| `NORDVPN_VERSION` | NordVPN Client | The version of the official NordVPN Linux package compiled into the image. | `Dockerfile`: `ARG NORDVPN_VERSION` |
| `IMAGE_VERSION` | Project Release | The semantic version of this container release itself. | `Dockerfile`: `ARG IMAGE_VERSION` |

### 2. Manifestations by Build Type

| Build Type | Pushed Tags (Docker Hub) | `IMAGE_VERSION` inside container | Target `NORDVPN_VERSION` |
|---|---|---|---|
| **Production Release** | `:latest`, `:<IMAGE_VERSION>` | SemVer (e.g. `5.5.0`) | Pinned version from Dockerfile |
| **Development Build** | `:dev`, `:dev-<git_hash>`, `:dev-<nordvpn_version>` | `dev-<git_hash>` | Pinned version (or manual input override) |
| **Local Test Build** | (None / Local only) | `<git_hash>` (e.g. `ce02c0b`) | Pinned version |

### 3. Runtime & Metadata Representation

* **Container Logs Banner**: `cont-init.d/00-version` reads `ENV IMAGE_VERSION` at container boot and logs an ASCII banner showing the project version.
* **OCI Annotations**: Standard OCI labels are written at compile-time, letting platforms inspect the project version without starting the container:
  ```bash
  docker inspect <image> --format '{{index .Config.Labels "org.opencontainers.image.version"}}'
  ```
* **Stateless Client Binary Check**: Running `nordvpn --version` with an overridden entrypoint directly returns the NordVPN package version:
  ```bash
  docker run --rm --entrypoint /bin/bash <image> -c "nordvpn --version"
  ```

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
