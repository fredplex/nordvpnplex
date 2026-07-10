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

## Key Decisions (2026-07-09 Build & Release Pipeline Review & Optimization)

### Decision: Parameterized base image digest pin

**Choice**: Added `ARG BASE_DIGEST` in `Dockerfile` before the `FROM` line. Updated `check-base-image.yml` and `publish-dev.yml` to pass it, and modified `check-base-image.sh` to parse it.
**Rationale**: In Monthly base-image updates, `publish-dev.yml` checks out `main` and builds/tests the image. Because the new digest pin was not yet in `main`'s `Dockerfile` at the time of the workflow run, the test built the *old* digest instead of the new one. Parameterization allows GHA to pass the new digest override at runtime.

### Decision: Build once, tag and push

**Choice**: Refactored `publish.yml` and `publish-dev.yml` to run a single `docker/build-push-action` build with `load: true` to test the local image. On success, simple `docker tag` and `docker push` commands are run from the runner's Docker daemon.
**Rationale**: Previously, workflows built the container twice—once to test, once to push—wasting time and creating a cache divergence risk where the tested bytes might differ from the pushed bytes.

### Decision: Direct push confirmation gating

**Choice**: Added `confirm-push.sh` interactive script in `Taskfile.yml` for local push tasks.
**Rationale**: Enforces that production release publishes go through GHA workflow CD, preventing accidental local pushes while preserving a gated fallback option.

### Decision: Dockerfile as single source of truth for versioning

**Choice**: Removed duplicate metadata version comments from `README.md` and `CLAUDE.md`, pointing them to the Dockerfile.
**Rationale**: Shrinks the code-drift surface and simplifies version bump operations.

---

## Key Decisions (2026-07-10 Version Logs Release Gap)

### Decision: publish.yml's release gate only fires on a version-bump diff — runtime changes without one are silently stranded on `main`

**Context**: The startup version-log feature (PR #12, merged 2026-07-09) changed `Dockerfile` and `rootfs/**` but did not bump `ARG IMAGE_VERSION`. `publish.yml`'s "Resolve release versions" step only sets `release_needed=true` on a `main` push when the merge diff matches `^\+ARG (NORDVPN|IMAGE)_VERSION=`; PR #12's diff didn't match, so the workflow ran, logged "No version bump detected in Dockerfile. Bypassing production release.", and exited green without publishing. The feature sat on `main`, invisible in every published image, until an unrelated bump happened to carry it out — discovered only because an owner compared a running container's digest against Docker Hub `latest` and found they matched (which only proves the server runs current `latest`, not that `latest` contains a given merge).
**Choice**: Added a hard-fail guard to `build-validate.yml` (runs first, before the build) that fails any PR touching `Dockerfile` or `rootfs/**` whose Dockerfile diff does not also bump `ARG IMAGE_VERSION`.
**Rationale**: The release gate's behavior (bump-diff-triggered publish) is correct and intentional — the gap was that nothing enforced the *contract's inverse* at PR time, so violating it failed silently instead of loudly. A hard fail matches the fact that any Dockerfile/rootfs change alters shipped image bytes; there is no legitimate reason to merge one without a corresponding release.
**Gotcha**: This is a durable rule for *any* future PR that touches `Dockerfile` or `rootfs/**`, not just release-pipeline work — it will fail in CI (not silently vanish) if the bump is missing. Fix: `bash scripts/bump.sh <NORDVPN_VERSION> <new IMAGE_VERSION> [ChangelogSummary]`. Full detail: `docs/build-and-publish.md` §4.2 and §9.

---

## Key Decisions (2026-07-10 Dev Build Gate for Manual PRs)

### Decision: only `auto/*` version-bump PRs got a dev-build-and-test cycle — manually created PRs shipped to production with no pullable image and no real-tunnel test

**Context**: PR #12 and PR #14 (both manually created `feature/*`/`fix/*` branches) merged to production with only `build-validate.yml`'s compile-check + fake-token smoke test — no dev image was ever pushed for either, so nobody could pull-test on real Unraid hardware or run `task verify-live` before they shipped. Only the two cron-triggered workflows (`check-nordvpn-release.yml`, `check-base-image.yml`) called `publish-dev.yml` before opening their PRs. Confirmed live: `:dev` was directly inspected and found to be missing `/build_version` and still carrying the broken pre-fix `00-version` shebang — i.e. `:dev` reproduced the exact bug this investigation started from, because it's a single moving tag only repointed as a side effect of the two cron workflows firing, with no relationship to arbitrary merges.
**Choice**: Extended `build-validate.yml` with two new jobs — `dev-build` (calls `publish-dev.yml` to build/smoke-test/push a real image, tagged `:<pinned-version>-dev-pr<N>`, refreshing the shared `:dev`/`:dev-<sha>`/`:dev-<nordvpn_version>` tags too) and `comment` (posts/updates the same "Before merging" checklist `auto/*` PRs already get) — gated on the existing IMAGE_VERSION-bump guard passing and the PR being same-repo (not a fork).
**Rationale**: The owner's explicit direction was that *any* change reaching production should go through a dev-build-and-test cycle, not just the two automated bump paths. Reusing `publish-dev.yml` as-is (just choosing a distinct `image_version` input) avoided duplicating its build/tag/smoke-test logic. Updating the shared `:dev` tag on *any* qualifying PR (not just `auto/*`) is what actually fixes the staleness problem going forward, not just once.
**Gotcha — dormant bug found and fixed along the way**: manually triggering `publish-dev.yml` to test this (Phase 0 of the same plan) failed immediately — the Dockerfile's `ARG BASE_DIGEST` redeclare line (added in `9f1b365`, needed to make the ARG visible inside a later `RUN`) made `grep "ARG BASE_DIGEST" Dockerfile` match two lines, breaking `$GITHUB_OUTPUT` parsing whenever `base_digest` wasn't explicitly overridden. This is the *default* code path for `check-nordvpn-release.yml`'s call to `publish-dev.yml` — meaning the next real NordVPN version release would have broken the daily automation's draft-PR flow. Also broke `check-base-image.yml`'s own digest comparison (silently — `task check-base` would always report "update available," even when current) since neither had been exercised since `9f1b365` landed. Fixed by matching `ARG BASE_DIGEST=` (the assignment) instead of the bare string, in all 3 affected spots (`publish-dev.yml`, `check-base-image.yml`, `scripts/check-base-image.sh`).
**Gotcha — tag naming**: the per-PR tag scheme (`<pinned-version>-dev-pr<N>`) deliberately avoids the `-dev` (no suffix) pattern `auto/*` PRs use, so a manual PR's dev build never collides with or gets confused with an automated bump PR's dev build even if both are open concurrently.

---

## Key Decisions (2026-07-05 Build & Release Workflow Hardening)

### Decision: bump.sh refuses to edit files with unresolved conflict markers

**Choice**: `scripts/bump.sh` greps `Dockerfile`, `README.md`, and `CLAUDE.md` for `^(<{7}|={7}|>{7})` before touching any of them, and exits with an error if found.
**Rationale**: `CLAUDE.md` carried unresolved git conflict markers on `main` for over a week after a bad merge (`5c8b103`, 2026-07-01) — `bump.sh`'s blind `sed` kept silently rewriting a version line sandwiched inside the broken block on every subsequent release instead of failing loudly.
**Gotcha**: If a future `task bump` run errors with "has unresolved merge conflict markers", the file genuinely has a broken merge — resolve it manually before retrying, do not bypass the guard.

### Decision: bump.sh auto-appends a Changelog entry on every run

**Choice**: `bump.sh` captures the outgoing `NORDVPN_VERSION`/`IMAGE_VERSION` before editing, derives a one-line summary (NordVPN bump vs. base-image-only refresh vs. caller-supplied wording), and appends it under `README.md`'s `## Changelog` (newest first). The `<!-- TODO -->` placeholder was dropped in the 2026-07-09 pipeline review; since 2026-07-10 an optional third argument (`CHANGELOG_SUMMARY`) sets the wording.
**Rationale**: The Changelog constraint in `CLAUDE.md` had gone stale for over a week because nothing wrote to it automatically — both human and automated bump paths skipped it every time.
**Gotcha**: Image-only bumps without the third argument default to "Base image refresh" wording — correct for the automated monthly base flow, wrong for feature/fix bumps, so pass a summary when bumping to ship container changes (e.g. `bash scripts/bump.sh 5.2.0 5.5.5 "ship container startup version logs"`).

### Decision: both automated bump workflows guard against concurrent `auto/*` PRs

**Choice**: `check-nordvpn-release.yml` (daily) and `check-base-image.yml` (monthly) each run a `gh pr list --state open` check for any `auto/*`-branch PR before applying a bump or opening a new one; if one is already open, the run logs it (PR number + link) and skips for that run.
**Rationale**: Both workflows call `scripts/bump.sh` against the same `Dockerfile`/`README.md`/`CLAUDE.md` lines. If both land in the same window, whichever merges second would conflict with or silently clobber the first PR's version fields.
**Gotcha**: If a bump PR sits open and unmerged for a long time, the *other* automation will keep skipping its own runs (correctly logged, not silently) until that PR is merged or closed.

---

## Key Decisions (2026-06-26 Dockerfile optimization)

### Decision: COPY --chmod=0755 (permission model)

**Choice**: Set executable bits in git via `git update-index --chmod=+x`; use `COPY --chmod=0755 rootfs /` instead of a 10-line `chmod` block.
**Rationale**: BuildKit stamps mode at copy time — deterministic on Windows (NTFS) and Linux CI. Eliminates a fragile build step. Requires `DOCKER_BUILDKIT=1`.
**Gotcha**: The `# syntax` directive must NOT be added to the Dockerfile — in this environment it triggers a 401 from Docker Hub for the frontend image. BuildKit is satisfied by `DOCKER_BUILDKIT=1` in Taskfile env or `docker/setup-buildx-action` in CI.

### Decision: Base image digest pin

**Choice**: `FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@sha256:53411508…`
**Rationale**: Makes the "never bump base without instruction" constraint enforceable — a tag re-target can no longer bypass it silently.

**Why the base image changes**: linuxserver.io periodically rebuilds `baseimage-ubuntu:noble` to include Ubuntu security patches, s6-overlay updates, and linuxserver-specific fixes. These updates affect libraries and binaries baked into the base image layers — the Dockerfile's `apt-get upgrade -y` patches installed packages but cannot update base layer components. The monthly `check-base-image.yml` workflow detects new digests, auto-builds a dev image against the new base, smoke-tests it, and opens a draft PR. Each base refresh is a first-class release: IMAGE_VERSION patch increment + full production publish pipeline on merge.

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
