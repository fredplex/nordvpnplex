<!-- prime: version=3.0.0 template=.ai/memory/architecture-decisions.md date=2026-06-30 -->
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

## Caching Strategy

No application-level caching — the container is stateless between restarts. Docker layer caching applies at build time. `task docker-build` does not use `--no-cache`, so apt layers are cached across builds. Force a cache bust with:
```bash
docker build --no-cache --platform linux/amd64 . -f Dockerfile -t "fredplex/nordvpn:$(git log --format='%h' -n 1)"
```

---

## Key Decisions (2026-06-26 Dockerfile optimization)

### Decision: COPY --chmod=0755 (permission model)

**Choice**: Set executable bits in git via `git update-index --chmod=+x`; use `COPY --chmod=0755 rootfs /` instead of a 10-line `chmod` block.
**Rationale**: BuildKit stamps mode at copy time — deterministic on Windows (NTFS) and Linux CI. Eliminates a fragile build step. Requires `DOCKER_BUILDKIT=1`.
**Gotcha**: The `# syntax` directive must NOT be added to the Dockerfile — in this environment it triggers a 401 from Docker Hub for the frontend image. BuildKit is satisfied by `DOCKER_BUILDKIT=1` in Taskfile env or `docker/setup-buildx-action` in CI.

### Decision: Base image digest pin

**Choice**: `FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@sha256:53411508…`
**Rationale**: Makes the "never bump base without instruction" constraint enforceable — a tag re-target can no longer bypass it silently.
**Gotcha**: Upgrading the base requires an explicit `@sha256:…` change. A monthly base-refresh cadence has been implemented to automate updates, dev builds, and draft PRs while keeping the digest pin protection.

### Decision: wireguard → wireguard-tools; iptables explicit

**Choice**: Replace `wireguard` with `wireguard-tools`; add `iptables` explicitly; remove `net-tools`, `iputils-ping`, `libc6`.
**Rationale**: `wireguard-tools` is sufficient for NordLynx (NordVPN `.deb` brings kernel support). `iptables` made explicit documents the kill-switch dependency. Other packages are unused dead weight.
**Gotcha**: Validated by `task verify-live` (Spain, NordLynx). Do not remove `wireguard-tools` without re-validating NordLynx.

### Decision: --restart=unless-stopped required at runtime

**Choice**: Document `--restart=unless-stopped` as a required run flag.
**Rationale**: The CMD chain is fail-closed. Container exits on unrecoverable VPN failure. Docker restart policy is the intended recovery mechanism.
**Gotcha**: Running without this means a VPN drop leaves users without network access permanently until manual restart.

### Decision: HEALTHCHECK for tunnel health reporting

**Choice**: `HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 CMD nordvpn status | grep -q "Status: Connected" || exit 1`
**Rationale**: Surfaces real tunnel state to Docker engine and Unraid dashboard. With NordLynx, container is healthy in ~5s.
**Gotcha**: HEALTHCHECK is a runtime signal, not a release gate. Use `task verify-live` as the release gate.

### Decision: DOCKER_BUILDKIT=1 in Taskfile env

**Choice**: Added `env: DOCKER_BUILDKIT: "1"` to Taskfile.yml top-level env block.
**Rationale**: Makes BuildKit unconditional for all local builds. Closes the local/CI gap (CI already uses buildx).
**Gotcha**: This is one of two approved Taskfile.yml changes (the other is `task verify-live`). Do not modify Taskfile.yml beyond these without explicit instruction.

### Decision: task verify-live as formal second-tier pre-release gate

**Choice**: `task verify-live TOKEN_FILE=<path>` wraps `scripts/connect-test.sh`. Required before `task release`.
**Rationale**: `task verify` uses a fake token and cannot validate tunnel connectivity. `task verify-live` is the only gate that catches protocol-level regressions (e.g. wireguard→wireguard-tools, NordLynx connectivity).
**Gotcha**: Token must come from a file outside the repo. Never print, echo, or log the token.

---

## Key Decisions (prior)

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

### Decision: Release notifications are GitHub-native (no SMTP)

**Choice**: `publish.yml` ends with `gh release create` (auth: built-in `GITHUB_TOKEN`), which creates the tag + a GitHub Release. Success = native release email to repo watchers; failure = GitHub's built-in Actions emails.
**Rationale**: No SMTP/app-password, no third-party action to pin/trust, no extra secrets. Real Releases page as a bonus. An SMTP step was drafted and deliberately reverted.
**Gotcha**: The owner must opt in once (Watch → Custom → Releases) or the success email isn't delivered. `gh release create` makes a *lightweight* tag (the old step made an annotated one); release notes carry the context.

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
- **Running a CMD without NET_ADMIN halts at s6 init**: A bare `docker run <image> nordvpn --version` goes through the default s6 `/init` entrypoint. Without `--cap-add=NET_ADMIN`, `00-firewall`'s `iptables` commands fail, s6 aborts init, and the CMD never runs. Use `--entrypoint /bin/bash` for stateless checks. This is what `scripts/verify.sh:49` does.
- **`curl` is a runtime dependency, not build-only**: `nord_watch:9` uses `curl -Is -m 30` at runtime to poll `CHECK_CONNECTION_URL`. Do not remove `curl` from the image.
- **wireguard-tools is sufficient; wireguard metapackage not needed**: NordVPN `.deb` brings WireGuard kernel support. `wireguard-tools` provides the userspace tools.
- **`# syntax` directive must NOT be added to the Dockerfile**: In this environment it triggers a 401 from Docker Hub for the BuildKit frontend image. BuildKit is satisfied by `DOCKER_BUILDKIT=1` in Taskfile env or CI buildx.
