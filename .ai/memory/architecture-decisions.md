# Architecture Decisions

Key architectural choices that define how this codebase works.

**Sources**: `docs/architecture.md`, `AGENTS.md`

---

## Data Flow

```
NordVPN Debian repo ──► Weekly GitHub Action ──► Draft PR (human reviews + merges)
                                                        │
                                               git pull (local)
                                                        │
                                            task docker-build (local)
                                                        │
                                             task verify (local)
                                                        │
                                             task release (tag + push)
                                                        │
                                       GitHub Action: publish.yml
                                                        │
                                                  Docker Hub
                                         fredplex/nordvpn:latest
                                         fredplex/nordvpn:<tag>
```

---

## Layer Discipline

This is a Docker container build project. The functional layers are:

- **Build layer** (Dockerfile + Taskfile): defines what goes into the image — base OS, NordVPN package, rootfs scripts
- **Init layer** (cont-init.d): runs once at container startup in filename order — firewall, version banner, network setup
- **Service layer** (services.d/nordvpn): long-running nordvpnd daemon managed by s6
- **Application layer** (CMD scripts: usr/bin/): login → config → connect → watchdog

---

## State Management

Container is stateless between restarts. The only persistent state is:
- `ENV IMAGE_VERSION` (baked at build time)
- NordVPN account token (injected at runtime via `TOKEN` or `TOKENFILE` env var)
- No database, no persistent volumes required for core function

---

## Auth Model

- NordVPN authentication: `TOKEN` env var (plain token) or `TOKENFILE` env var (path to file, for docker secrets)
- No web auth — this is a headless container

---

## Key Decisions

### Decision: OCI Labels + ENV for version (not `/.version` file)

**Choice**: `ENV IMAGE_VERSION=${IMAGE_VERSION}` + `LABEL org.opencontainers.image.version="${IMAGE_VERSION}"`
**Rationale**: Queryable without running the container (`docker inspect`); standard; visible on Docker Hub; no append-bug risk
**Gotcha**: `task docker-build` injects the git hash as IMAGE_VERSION (not the semver). Seeing a hash on a local test build is expected and correct. Published images get the semver tag via the publish workflow.

### Decision: Kill switch fires first (00-firewall runs before VPN connects)

**Choice**: `cont-init.d/00-firewall` sets iptables OUTPUT policy to DROP before nordvpnd starts
**Rationale**: Prevents any traffic leaking while the VPN is establishing. Fail-safe by default.
**Gotcha**: If the firewall script fails, s6 halts init — the container won't start. This is intentional (fail safe), not a bug.

### Decision: Version banner in cont-init.d (not CMD)

**Choice**: `cont-init.d/00-version` prints the version banner; removed from the CMD chain
**Rationale**: Fits the s6 pattern — init-time work belongs in cont-init.d. CMD should only start long-running processes.
**Gotcha**: Banner appears before any s6 service starts, so it appears early in logs. This is correct.

### Decision: Human-in-the-loop publish gate

**Choice**: No automated image push. Owner must run `task release` manually after local verification.
**Rationale**: Owner is the sole maintainer. Automated publish without local verification could push a broken image to Docker Hub and break Unraid users.
**Gotcha**: `task release` reads both versions directly from the Dockerfile — do not run it if Dockerfile edits are not committed.

---

## Gotchas

- **CRLF line endings in rootfs/**: Shell scripts with CRLF fail inside the container with `bad interpreter`. `.gitattributes` enforces LF on checkout, but double-check when creating new scripts on Windows.
- **`task docker-build` injects git hash**: The local test image has a hash in IMAGE_VERSION, not the semver. `task verify` confirms the hash — this is correct behavior.
- **No `/.version` file**: Older agent docs may reference `/.version` at the container root — this was removed in the version-mechanism-refactor. The source of truth is now `ENV IMAGE_VERSION` and the OCI label.
- **`task release` requires a clean working tree and non-duplicate tag**: Always commit before running.
- **nordvpnd socket check takes 12s**: The verify script waits for the daemon to start. Expected.
