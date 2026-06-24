# Architecture Decisions

Key architectural choices that define how this codebase works.

**Sources**: `docs/architecture.md`, `AGENTS.md`

---

## Data Flow

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
                                                    Docker Hub             Git Tag push
                                              :latest, :<version>        (back to repo)
```

**Alternative release paths**:
- **Manual Dev Publish**: Owner triggers GHA `Publish Dev to Docker Hub` with optional version override. Pushes `:dev`, `:dev-<sha>`, and `:dev-<version>`.
- **Manual Prod Publish**: Owner triggers GHA `Publish to Docker Hub` manually with version inputs. Runs tests and publishes.
- **Local Fallback**: Owner bumps versions using `task bump`, builds/verifies locally, and runs `task release` to tag and trigger GHA CD.

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

**Choice**: Human review of the auto-created draft PR is the final release gate. GitHub Actions automates the build, test, tag, and publish steps *after* approval.
**Rationale**: GHA checks versions daily, auto-builds & tests a dev image, and opens a draft PR only if those tests pass. This provides verification data *before* the owner merges. Merging the PR then triggers GHA to run CD, performing a final smoke test check before pushing to Docker Hub.
**Gotcha**: Pushes are fully automated, but still completely gated by the owner merging the PR. Manually tagging or running local `task release` is no longer the primary path (though retained as a fallback).

---

## Gotchas

- **CRLF line endings in rootfs/**: Shell scripts with CRLF fail inside the container with `bad interpreter`. `.gitattributes` enforces LF on checkout, but double-check when creating new scripts on Windows.
- **`task docker-build` injects git hash**: The local test image has a hash in IMAGE_VERSION, not the semver. `task verify` confirms the hash — this is correct behavior.
- **No `/.version` file**: Older agent docs may reference `/.version` at the container root — this was removed in the version-mechanism-refactor. The source of truth is now `ENV IMAGE_VERSION` and the OCI label.
- **`task release` requires a clean working tree and non-duplicate tag**: Always commit before running.
- **nordvpnd socket check takes 12s**: The verify script waits for the daemon to start. Expected.
- **Running a CMD without NET_ADMIN halts at s6 init**: A bare `docker run <image> nordvpn --version` goes through the default s6 `/init` entrypoint. Without `--cap-add=NET_ADMIN`, `00-firewall`'s `iptables` commands fail, s6 aborts init, and the CMD never runs (empty output). To run the binary directly for a stateless check, override the entrypoint: `docker run --rm --entrypoint /bin/bash <image> -c "nordvpn --version"`. This is what `scripts/verify.sh:49` does, and what the CI smoke tests in `publish-dev.yml` / `publish.yml` must do (fixed 2026-06-24, `fc8a147`). The alternative — granting `--cap-add=NET_ADMIN` — is used by the kill-switch smoke check instead.
