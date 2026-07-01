<!-- prime: version=3.0.0 template=docs/architecture.md date=2026-06-30 -->
# Architecture

Core architecture philosophy, layer discipline, and design decisions for **fredplex/nordvpn**.

**Working copy**: `.ai/memory/architecture-decisions.md`

---

## Overview

`fredplex/nordvpn` is a **Docker container build project**. It packages the official NordVPN Linux client into a Docker image for use as a VPN gateway on Unraid NAS systems. This is not a web app or API — there is no Node.js, no database, no REST surface.

**Stack**: Ubuntu Noble (linuxserver.io base), NordVPN Linux client, WireGuard/NordLynx, s6-overlay, Docker, GitHub Actions

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

**Health reporting**: `HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 CMD nordvpn status | grep -q "Status: Connected" || exit 1` surfaces real tunnel state to Docker engine and the Unraid dashboard. The container transitions `starting → healthy` once the first `nordvpn status` confirms connection.

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

**Context**: A successful production release used to be silent — `publish.yml` ended by pushing a bare git tag, which notifies no one.
**Decision**: Use **GitHub-native** signals only — no SMTP, no third-party action, no secrets:
- **Success** → `publish.yml` finishes with `gh release create` (auth: built-in `GITHUB_TOKEN`), which creates the tag **and** a GitHub Release. Publishing the Release triggers GitHub's native notification email to repo watchers.
- **Failure** → GitHub's built-in **Actions** notifications email the run's actor / scheduled-workflow editor (Settings → Notifications → Actions).
**Rationale**: Zero secret management, no third-party action to trust or pin, and a real Releases page as a side benefit.
**Consequences**: The owner must opt in once: **Watch → Custom → Releases** to receive the success emails.

### COPY --chmod=0755 (permission model)

**Context**: The Dockerfile previously ran a multi-line `chmod +x` block after `COPY rootfs /` because 18 of 19 rootfs scripts were non-executable in git (`100644`). The block was fragile and NTFS-opaque.
**Decision**: Set executable bits in git via `git update-index --chmod=+x` on all 17 scripts, then replace the whole `chmod` block with `COPY --chmod=0755 rootfs /`.
**Rationale**: BuildKit stamps the mode at copy time — deterministic on both Windows (NTFS, which has no exec bit) and Linux CI. One line replaces ten.
**Consequences**: Requires `DOCKER_BUILDKIT=1`. `Taskfile.yml` sets `env: DOCKER_BUILDKIT: "1"` globally so local builds never regress.

### Base image digest pin

**Context**: `FROM ghcr.io/linuxserver/baseimage-ubuntu:noble` always resolves to whatever the tag points to at build time — a future linuxserver.io push could silently change the base.
**Decision**: Pin the digest: `FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@sha256:53411508...`
**Rationale**: The CLAUDE.md constraint "never bump the base image without explicit instruction" was aspirational without the pin — a tag re-target would bypass it. The digest makes the constraint enforceable.
**Consequences**: Upgrading the base requires an explicit `@sha256:…` update. A monthly base-refresh cadence has been implemented (via check-base-image.yml cron) to automate digest updates, dev testing, and draft PRs while keeping the digest pin protection.

### Why the base image changes (and why we check monthly)

The base image (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) is linuxserver.io's Ubuntu Noble Docker base. It provides the s6-overlay process supervisor, core OS libraries, and a curated set of base utilities. linuxserver.io periodically rebuilds this image to include:

- **Ubuntu security patches** — fixes for CVEs in base OS packages
- **s6-overlay updates** — the process supervisor that runs init scripts and manages services
- **linuxserver-specific hardening and fixes** — patches and improvements from their base-image project

**The security patch gap**: The Dockerfile's `apt-get upgrade -y` patches packages installed *into* the image at build time, but it cannot update binaries and libraries that were baked into the base image layers at linuxserver.io's build time (s6-overlay, base system libraries, etc.). These only change when the base image digest changes.

The monthly `check-base-image.yml` workflow bridges this gap: it detects when linuxserver.io has published a new digest, automatically builds and smoke-tests a dev image against it, and opens a draft PR with the updated digest pin. This keeps the image current with security patches while preserving deterministic, reproducible builds via the digest pin. Each base refresh is a first-class release: the `IMAGE_VERSION` patch increments, and the same production publish pipeline (verify → push → GitHub Release) fires on merge. See the [User Guide §5 Rebuilding / Refreshing the Base Image](user-guide.md#rebuilding--refreshing-the-base-image) for the owner-facing operational steps.

### wireguard → wireguard-tools (package rationalisation)

**Context**: The Dockerfile installed the `wireguard` metapackage. The NordVPN `.deb` itself brings in WireGuard kernel support.
**Decision**: Replace `wireguard` with `wireguard-tools` (userspace tools only). Also make `iptables` an explicit install.
**Rationale**: `wireguard-tools` is sufficient for NordLynx. Explicit `iptables` install documents the kill-switch dependency.
**Consequences**: Validated by `task verify-live` (Spain egress, NordLynx, ~5s connect). Smaller attack surface.

### --restart=unless-stopped requirement

**Context**: The CMD chain (`nord_login → nord_config → nord_connect → nord_watch`) is fail-closed. If the VPN becomes unrecoverable the container exits.
**Decision**: Document `--restart=unless-stopped` as a required run flag.
**Rationale**: Docker's restart policy is the recovery mechanism for transient failures.
**Consequences**: Running without this means a VPN drop leaves users without network access until manual restart.

### HEALTHCHECK for Docker/Unraid health reporting

**Context**: Docker had no visibility into whether the VPN tunnel was actually connected. `docker ps` showed `Up` even when the tunnel had failed internally.
**Decision**: `HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 CMD nordvpn status | grep -q "Status: Connected" || exit 1`
**Rationale**: Surfaces real tunnel state to Docker engine and Unraid's dashboard. With NordLynx the container is typically healthy within 5 seconds.
**Consequences**: Unraid operators can see container health at a glance. Docker Compose `depends_on: condition: service_healthy` can gate dependent containers.

### BuildKit enforced for local builds

**Context**: `COPY --chmod=0755` is a BuildKit feature. Without `DOCKER_BUILDKIT=1`, the build falls back to the legacy builder which rejects the flag.
**Decision**: Set `DOCKER_BUILDKIT: "1"` in Taskfile.yml's top-level `env:` block.
**Rationale**: Makes BuildKit explicit and unconditional for all local builds. CI already uses `docker/setup-buildx-action`.
**Consequences**: Any local `task docker-build` will always use BuildKit.

---

## Caching Strategy

No application-level caching — the container is stateless between restarts. The only state that persists is:
- `ENV IMAGE_VERSION` (baked at build time)
- NordVPN account token (injected at runtime via `TOKEN` or `TOKENFILE` env var)

Docker layer caching applies at build time. `task docker-build` does not use `--no-cache`, so apt layers are cached across builds. Force a cache bust with:
```bash
docker build --no-cache --platform linux/amd64 . -f Dockerfile -t "fredplex/nordvpn:$(git log --format='%h' -n 1)"
```

---

## Auth Model

- **VPN auth**: NordVPN account token injected at runtime via `TOKEN` env var (plain) or `TOKENFILE` env var (path to a file — for docker secrets). `nord_login` reads this and authenticates with the NordVPN API.
- **No web auth**: This is a headless container. No HTTP surface, no sessions, no JWTs, no API keys managed by the container itself.
- **Token security**: Token must never appear in Docker logs, `docker inspect` output, or CLI args. `TOKENFILE` is the preferred pattern for production — avoids the token appearing in `docker ps` env output.

---

## Real-Time / Events

- `nord_watch` polls `CHECK_CONNECTION_URL` (default: `www.google.com`) every `CHECK_CONNECTION_INTERVAL` seconds (default: 300s).
- On failure, sends an s6 restart signal to the nordvpn service.
- Docker HEALTHCHECK polls `nordvpn status` every 60s and reports `healthy`/`unhealthy` to the Docker engine.

---

## Operational Logging

- `cont-init.d/00-version` prints the IMAGE_VERSION banner early in startup logs.
- nordvpnd daemon logs to stdout/stderr (captured by s6 and Docker).
- No structured JSON logging — plain text to Docker's log driver.

---

## Versioning Design

The project separates NordVPN's client application version from the container project's release version. These versions manifest across different lifecycle stages (build, test, deploy, run).

### 1. Version Identifiers

| Variable | Scope | Description | Source of Truth |
|---|---|---|---|
| `NORDVPN_VERSION` | NordVPN Client | The version of the official NordVPN Linux package compiled into the image. | `Dockerfile`: `ARG NORDVPN_VERSION` |
| `IMAGE_VERSION` | Project Release | The semantic version of this container release itself. | `Dockerfile`: `ARG IMAGE_VERSION` |
| `NORDVPN_RELEASE` | Repo bootstrap | The version of the `nordvpn-release` Debian package that installs the NordVPN apt repo. Decoupled from `NORDVPN_VERSION` so the bootstrap package and client package can move independently. | `Dockerfile`: `ARG NORDVPN_RELEASE` |

### 2. Manifestations by Build Type

| Build Type | Pushed Tags (Docker Hub) | `IMAGE_VERSION` inside container | Target `NORDVPN_VERSION` |
|---|---|---|---|
| **Production Release** | `:latest`, `:<IMAGE_VERSION>` | SemVer (e.g. `5.5.0`) | Pinned version from Dockerfile |
| **Development Build** | `:dev`, `:dev-<git_hash>`, `:dev-<nordvpn_version>`, `:<image_version>-dev` | `:<image_version>-dev` (e.g. `5.5.0-dev`) | Pinned version (or manual input override) |
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

## Known Constraints and Gotchas

- **CRLF line endings in rootfs/**: Shell scripts with CRLF fail with `bad interpreter`. `.gitattributes` enforces LF on checkout; verify when creating new scripts on Windows.
- **`task docker-build` injects git hash**: The local image has a hash in IMAGE_VERSION, not the semver. `task verify` confirms the hash — this is correct behavior.
- **No `/.version` file**: Older references to `/.version` in the container root are stale. Version is now `ENV IMAGE_VERSION` only.
- **nordvpnd socket check takes 12s**: The verify script waits for the daemon to start before checking. Expected.
- **`task release` requires a clean working tree and non-duplicate tag**: Always commit before running.
- **`task verify` runs under Git Bash on Windows**: `scripts/verify.sh` sets `MSYS_NO_PATHCONV=1` and `MSYS2_ARG_CONV_EXCL='*'` at the top to prevent MSYS/Git Bash from mangling `--entrypoint /bin/bash` into a Windows path. WSL2 is no longer required for `task verify`.
- **BuildKit required for `COPY --chmod`**: The Dockerfile uses `COPY --chmod=0755 rootfs /`, which is a BuildKit feature. Without BuildKit the build fails with "unknown flag". Locally, `Taskfile.yml`'s `env: DOCKER_BUILDKIT: "1"` satisfies this. CI uses `docker/setup-buildx-action`. Do **not** add a `# syntax` directive to the Dockerfile — in this environment it triggers a 401 from Docker Hub for the frontend image.
- **`--restart=unless-stopped` required at runtime**: The CMD chain exits when the VPN is unrecoverable. Always run the container with `--restart=unless-stopped`.
