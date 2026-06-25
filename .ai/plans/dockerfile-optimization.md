# Dockerfile Optimization Plan

Created: 2026-06-25 | Status: Pending review (revised after deep analysis)

## Complete Reasoning — detailed analysis and rationale

This section documents the full reasoning process behind every finding and recommendation in this plan. It is intentionally thorough and may duplicate explanations found in later sections — the goal is to provide a complete, self-contained record of *why* each recommendation was made, *what* evidence supports it, and *how* the original assumptions were corrected during the deep analysis.

### The two-pass review process

This plan went through two distinct passes:

1. **First pass (initial review)**: A quick review of only the `Dockerfile` itself. This produced three recommendations: remove `apt-get upgrade`, remove `curl`, and move permissions to source. Two of these three were **wrong** — they were based on assumptions about runtime behavior that weren't verified against the actual scripts.

2. **Second pass (deep analysis)**: A comprehensive review of every file that interacts with the Dockerfile: all 19 `rootfs/` scripts, `Taskfile.yml`, `verify.sh`, `bump.sh`, `dev-build.sh`, `get-latest-version.sh`, all 3 GitHub Actions workflows, `.gitattributes`, `.dockerignore`, and the git index permissions. This pass corrected the errors from the first pass and uncovered 9 additional findings.

The lesson: **a Dockerfile cannot be evaluated in isolation.** Every `RUN`, `COPY`, and `ENV` instruction interacts with scripts, CI workflows, and build tooling that live outside the file. Reviewing only the Dockerfile leads to recommendations that break runtime behavior.

---

### Correction 1: `curl` is a runtime dependency, not build-only

**Original assumption**: `curl` is installed in the `apt-get install` line (Dockerfile line 22) and used to download the NordVPN repo `.deb` (line 23). Since it's only used during the build, it must be a build-time dependency that can be removed from the final image.

**What the deep analysis found**: `rootfs/usr/bin/nord_watch` line 9 contains:
```bash
if [[ ! $(curl -Is -m 30 -o /dev/null -w "%{http_code}" "${CHECK_CONNECTION_URL:-www.google.com}") =~ ^[23] ]]; then
```

The watchdog script uses `curl` to poll `CHECK_CONNECTION_URL` (default: `www.google.com`) every `CHECK_CONNECTION_INTERVAL` seconds (default: 300s). This is core runtime functionality — the container's reconnection logic depends on it. Removing `curl` would silently break the watchdog.

**Correction**: `curl` must stay in the final image. The original recommendation to `apt-get purge -y curl` at the end of the install block was wrong and is retracted.

**Also verified**: `curl` is NOT used by any other `rootfs/` script. The `check-version.sh`, `bump.sh`, and `get-latest-version.sh` scripts use `curl`, but those run on the host (or in GitHub Actions), not inside the container. Only `nord_watch` uses it at runtime.

---

### Correction 2: The `chmod` block is necessary, not gratuitous

**Original assumption**: The `chmod` block (Dockerfile lines 38-48) is unnecessary overhead because Docker preserves file permissions during `COPY`. If the source files had the right permissions, the `chmod` block could be removed.

**What the deep analysis found**: Running `git ls-files --stage rootfs/` revealed the actual permission state of every tracked file:

- 18 of 19 `rootfs/` files have mode `100644` (non-executable)
- Only `rootfs/usr/bin/nord_watch` has mode `100755` (executable)

This means the `chmod` block is **not gratuitous** — it's the only thing making the scripts executable inside the container. Without it, the container would fail to start because s6 couldn't execute the cont-init.d scripts or the service run script.

**However**, the block is still suboptimal for two reasons:
1. It creates an extra `RUN` layer (extra build time, extra image layer)
2. It's fragile — every time a new script is added to `rootfs/`, someone must remember to add a `chmod` line to the Dockerfile

**Correction**: The recommendation changes from "the `chmod` block is unnecessary" to "set the executable bits in git (via `git update-index --chmod=+x`), then remove the `chmod` block." This is a Tier 1 win because it's safe and improves maintainability — but the rationale is "eliminate a fragile build step" not "remove gratuitous overhead."

**Important detail**: `notification-fd` and `type` in `rootfs/etc/services.d/nordvpn/` are data files (containing `3` and `longrun` respectively), not scripts. They must NOT have the executable bit set. The `chmod` block correctly doesn't touch them (it uses `/*` glob on `cont-init.d/` only, and lists specific files elsewhere), and the `git update-index` commands must also skip them.

---

### Correction 3: `apt-get upgrade` is a decision point, not a clear win

**Original assumption**: `apt-get upgrade -y` (Dockerfile line 21) is unnecessary because the base image is pinned and regularly updated by linuxserver.io. Removing it follows Docker best practices (reproducible builds, smaller layers, faster builds).

**What the deep analysis found**: `AGENTS.md` Key Boundaries explicitly states: "Bumping the base image (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) without explicit instruction" is in the **Not approved** list. This means the owner deliberately keeps the base image pinned and does NOT regularly pull a fresh base.

Given this constraint, `apt-get upgrade` may be the **only mechanism** applying security patches to the base image's packages between NordVPN version bumps. Removing it could leave known-vulnerable packages in the image for months.

**Correction**: This is not a clear win. It's a **tradeoff** between Docker best practices (reproducibility, smaller image) and security posture (patching without bumping the base image). This moves to Tier 2 (owner decision) with the full tradeoff explained.

**Alternative recommended**: If the owner wants to remove `apt-get upgrade`, they should adopt a practice of running `docker build --pull` periodically to get a fresh base image, or explicitly approve periodic base image pulls. But that's a workflow change, not a Dockerfile change.

---

### New finding 4: `libc6` is redundant

**Reasoning**: `libc6` is the GNU C Library — it's a core package in every Ubuntu installation. The base image `ghcr.io/linuxserver/baseimage-ubuntu:noble` (Ubuntu 24.04) already includes it. Installing it via `apt-get install -y libc6` is a no-op: apt recognizes it's already installed at the latest version and does nothing.

**Evidence**: `libc6` is listed in the `apt-get install` command on Dockerfile line 22. There is no scenario where Ubuntu Noble doesn't have `libc6` — it's a dependency of `apt` itself.

**Risk**: None. Removing it changes nothing at runtime. This is a safe Tier 1 win.

**Why it was originally there**: Likely inherited from the upstream `bubuntux/nordvpn` Dockerfile, which may have had a different base image or a historical reason that no longer applies.

---

### New finding 5: `net-tools` is unused

**Reasoning**: `net-tools` provides `ifconfig`, `route`, `netstat`, and `arp`. These are legacy networking tools superseded by `iproute2` (which provides the `ip` command). The base image includes `iproute2`.

**Evidence**: Searched every `rootfs/` script for usage of `ifconfig`, `route`, `netstat`, or `arp`:
- `20-inet` uses `iptables` and `dockerNetworks` (which uses `ip`)
- `30-route` uses `ip route` and `iptables`
- `dockerNetworks` uses `ip link` and `ip -o addr`
- `dockerNetworks6` uses `ip link` and `ip -o addr`
- `nord_login` uses `ip route` (for the null-route fallback)
- No script uses `ifconfig`, `route`, `netstat`, or `arp`

**Risk**: Low. The only reason to keep it is for manual debugging (`docker exec -it <container> ifconfig`). This is an owner decision — Tier 2.

**Size impact**: `net-tools` is approximately 250 KB installed.

---

### New finding 6: `iputils-ping` is unused

**Reasoning**: `iputils-ping` provides the `ping` command. No `rootfs/` script calls `ping`.

**Evidence**: Searched every `rootfs/` script for `ping` — zero matches. The watchdog (`nord_watch`) uses `curl` for connectivity checks, not `ping`.

**Risk**: Low. Same as `net-tools` — only useful for manual debugging. Owner decision — Tier 2.

**Size impact**: `iputils-ping` is approximately 100 KB installed.

---

### New finding 7: `wireguard` may be redundant

**Reasoning**: The `wireguard` package is installed explicitly (Dockerfile line 22). However, the NordVPN `.deb` package likely depends on `wireguard` (or `wireguard-tools`) as a dependency — apt would auto-install it when installing `nordvpn`. If so, the explicit install is redundant.

**Evidence**: Cannot verify without inspecting the NordVPN package's `Depends:` field. The NordVPN client uses NordLynx (a WireGuard-based protocol), so it's plausible the package depends on `wireguard-tools`.

**Risk**: Medium. If `wireguard` is NOT a dependency of the NordVPN package, removing it would break NordLynx. This must be tested, not assumed.

**Approach**: Tier 2 — remove it, run `task docker-build` + `task verify`, and specifically verify NordLynx connectivity (not just socket existence). If `task verify` fails check 4 (nordvpnd socket) or if `nordvpn status` doesn't show "Connected", add it back immediately.

**Why this matters**: `wireguard` + `wireguard-tools` is approximately 5 MB installed. If it's redundant, removing it is a meaningful size reduction.

---

### New finding 8: `.dockerignore` is incomplete

**Reasoning**: The build context is the set of files sent to the Docker daemon when running `docker build`. Every file not excluded by `.dockerignore` is sent, even if the Dockerfile never references it. A larger build context means slower builds and more memory used by the daemon.

**Evidence**: Current `.dockerignore`:
```
.git
.github
.img
*.md
LICENSE
```

Missing exclusions (files/dirs that exist in the repo but are never used by the Dockerfile):
- `.ai/` — agent workspace, ~50+ files
- `docs/` — product documentation, ~10+ files
- `scripts/` — host-side build scripts (bump.sh, verify.sh, etc.) — NOT used inside the container
- `Taskfile.yml` — host-side task runner config
- `.gitattributes` — git config
- `.ai-prime-version` — template version file
- `.ai-prime-versions.json` — template version record
- `.ai-plans/` (if present) — plan files

**Risk**: None. These files are never referenced by `COPY` or `ADD` in the Dockerfile. Adding them to `.dockerignore` is purely a build-context-size optimization. Tier 1.

**Note**: `scripts/` is used by `verify.sh` and `bump.sh`, but those run on the host, not inside the container during `docker build`. The Dockerfile never `COPY`s from `scripts/`.

---

### New finding 9: `nord_config` shebang inconsistency

**Reasoning**: The shebang line tells the kernel which interpreter to use. Consistency across scripts matters for readability and debugging.

**Evidence**:
- `nord_config` line 1: `#!/usr/bin/with-contenv bash` (missing `/bin/` prefix on `bash`)
- All other `with-contenv` scripts use: `#!/usr/bin/with-contenv /bin/bash`

**Why it works anyway**: Ubuntu Noble uses merged-usr (`/bin` is a symlink to `/usr/bin`), so `bash` resolves the same as `/bin/bash`. But it's non-standard and could break on a non-merged-usr system.

**Risk**: None at runtime on Noble. Fixing it is a Tier 1 consistency improvement.

---

### New finding 10: `nord_watch` shebang inconsistency

**Reasoning**: Same as finding 9 — consistency.

**Evidence**:
- `nord_watch` line 1: `#!/usr/bin/bash` (not using `with-contenv`, and using `/usr/bin/bash` directly)
- All other CMD scripts use `#!/usr/bin/with-contenv /bin/bash`
- `nord_watch` is the only script that doesn't use `with-contenv`

**Why it works anyway**: `with-contenv` injects environment variables from s6's container environment. `nord_watch` uses `CHECK_CONNECTION_URL` and `CHECK_CONNECTION_INTERVAL` env vars — these are Docker `ENV` vars (set via `-e` or `docker-compose`), not s6 container env vars. So `with-contenv` may not be strictly necessary. However, the inconsistency is worth noting.

**Risk**: None observed at runtime. Fixing the shebang to `#!/bin/bash` (standard path) is a Tier 1 consistency improvement. Whether to also add `with-contenv` is a separate question — if the env vars are Docker ENV vars, it doesn't matter; if they're s6 container env vars, `with-contenv` is needed. Since the container works today, the env vars are Docker ENV vars, and `with-contenv` is not required.

**Decision**: Fix the path to `/bin/bash` for consistency. Do NOT add `with-contenv` — if it ain't broke, don't fix it.

---

### New finding 11: `COPY /rootfs /` non-standard syntax

**Reasoning**: The `COPY` instruction's source path is relative to the build context. A leading `/` in the source path is non-standard — Docker interprets it as an absolute path within the build context, which works, but it's not the conventional syntax.

**Evidence**: Dockerfile line 36: `COPY /rootfs /`. Standard Docker syntax is `COPY rootfs /` (no leading slash on the source).

**Risk**: None — it works. But it's inconsistent with Docker conventions and could confuse contributors. Tier 1 fix.

---

### New finding 12: No `HEALTHCHECK` instruction

**Reasoning**: Docker's `HEALTHCHECK` instruction tells the container runtime how to verify the container is actually functional. Without it, Docker (and Unraid) reports the container as "healthy" as long as PID 1 (s6) is running — even if the VPN tunnel is down, the kill switch has blocked all traffic, or `nordvpnd` has crashed.

**Evidence**: The Dockerfile has no `HEALTHCHECK` line. The `nord_watch` script acts as an internal watchdog (polling and restarting), but Docker's health status doesn't reflect this — it only sees PID 1.

**Current mitigation**: `services.d/nordvpn/data/check` already checks for the nordvpnd socket (`[ -S /run/nordvpn/nordvpnd.sock ]`). This is s6's readiness check, not Docker's health check.

**Proposed HEALTHCHECK**: Something like:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD nordvpn status | grep -q "Status: Connected" || exit 1
```

**Risk**: Low overhead (runs `nordvpn status` every 30s). But this is an enhancement, not an optimization — it adds new behavior. Owner decision — Tier 2.

**Why it's Tier 2**: Adding `HEALTHCHECK` changes how Unraid reports container status. The owner should decide if they want this behavior change.

---

### How findings were tiered

The tiering logic:

- **Tier 1 (clear wins)**: No behavior change, no risk to runtime, no owner decision needed. Either removes redundancy, fixes inconsistency, or improves maintainability. If the change is reverted, nothing breaks.
- **Tier 2 (owner decision)**: Involves a tradeoff (size vs. security, size vs. debugging convenience, new behavior) or requires testing to verify safety. The owner must weigh the tradeoff.
- **Tier 3 (future)**: Out of scope for this plan. Worth noting for future work.

**Items that were considered but NOT included**:

- **Consolidating the `apt-get` operations into fewer `RUN` blocks**: The current Dockerfile already has a single `RUN` for the install sequence (lines 20-34). The `chmod` block is a separate `RUN` (lines 39-48), but it's being eliminated via Tier 1 recommendation #2. No further consolidation is possible without merging the `COPY` and `chmod` — but `COPY` must come before `chmod`, and `COPY` is a separate instruction. This is already optimal.
- **Using `--no-install-recommends`**: Would reduce image size by skipping recommended (but not required) packages. However, this could break NordVPN if it relies on recommended packages. Too risky without testing — and the NordVPN package's recommends are unknown. Not included.
- **Pin package versions with `=version`**: Not applicable — we want the latest compatible versions of the utility packages. Only NordVPN is pinned (already done via `nordvpn=${NORDVPN_VERSION}`).

---

### Summary of the reasoning

| # | Finding | Original assumption | Corrected understanding | Tier |
|---|---|---|---|---|
| 1 | `curl` | Build-only, can remove | Runtime dependency (`nord_watch`) — keep | — |
| 2 | `chmod` block | Unnecessary overhead | Necessary (18/19 files non-exec) — but can be eliminated via git bits | 1 |
| 3 | `apt-get upgrade` | Remove (best practice) | Decision point — may be security patching mechanism | 2 |
| 4 | `libc6` | (not found) | Redundant — already in base image | 1 |
| 5 | `net-tools` | (not found) | Unused by any script | 2 |
| 6 | `iputils-ping` | (not found) | Unused by any script | 2 |
| 7 | `wireguard` | (not found) | May be redundant — NordVPN .deb may auto-install | 2 |
| 8 | `.dockerignore` | (not found) | Missing `.ai/`, `docs/`, `scripts/`, etc. | 1 |
| 9 | `nord_config` shebang | (not found) | Missing `/bin/` prefix | 1 |
| 10 | `nord_watch` shebang | (not found) | Uses `/usr/bin/bash` instead of `/bin/bash` | 1 |
| 11 | `COPY /rootfs /` | (not found) | Non-standard leading slash | 1 |
| 12 | `HEALTHCHECK` | (not found) | No Docker health check — container reports healthy even if VPN is down | 2 |

---

## Background — why this is needed

The current `Dockerfile` (52 lines) is functional and produces a working image. A deep review of the `Dockerfile`, all 19 `rootfs/` scripts, `Taskfile.yml`, `verify.sh`, `bump.sh`, the GitHub Actions workflows, `.gitattributes`, `.dockerignore`, and the git index permissions revealed several optimization opportunities — and also revealed that some of the original recommendations were **wrong** (notably: `curl` is a runtime dependency, not build-only).

This revision corrects those errors and separates clear wins from items requiring owner decisions.

## What was reviewed

- `Dockerfile` (every line)
- All 19 `rootfs/` files: `cont-init.d/00-*` through `40-allowlist`, `services.d/nordvpn/*`, `usr/bin/*`
- `Taskfile.yml` — build, dev-build, verify, release task definitions
- `scripts/verify.sh`, `scripts/bump.sh`, `scripts/dev-build.sh`, `scripts/get-latest-version.sh`
- `.github/workflows/` — `build-validate.yml`, `publish.yml`, `publish-dev.yml`
- `.gitattributes` — line-ending enforcement
- `.dockerignore` — build context exclusions
- `git ls-files --stage rootfs/` — actual executable-bit state of every tracked file

## Corrected findings from deep analysis

### Corrections to the original plan

| # | Original claim | Actual finding | Source |
|---|---|---|---|
| 1 | `curl` is a build-only dependency that remains in the final image | **`curl` is a runtime dependency** — `nord_watch:9` uses `curl -Is -m 30` to poll `CHECK_CONNECTION_URL` every 300s. Cannot be removed. | `rootfs/usr/bin/nord_watch` line 9 |
| 2 | The `chmod` block is unnecessary overhead | The `chmod` block IS necessary — 18 of 19 `rootfs/` files are `100644` (non-executable) in git. Only `nord_watch` is `100755`. The block can be eliminated by setting git bits, but the current code is not gratuitous. | `git ls-files --stage rootfs/` |
| 3 | `apt-get upgrade` should be removed | This is a **decision point**, not a clear win. The owner has a constraint against bumping the base image without explicit instruction. `apt-get upgrade` may be the security-patching mechanism. Removing it means relying entirely on linuxserver's base image rebuild cadence. | `AGENTS.md` Key Boundaries |

### New findings not in the original plan

| # | Finding | Evidence | Risk |
|---|---|---|---|
| 4 | **`libc6` is redundant** — Ubuntu Noble already includes it. Installing it is a no-op. | Dockerfile line 22; `libc6` is a core Ubuntu package. | None — safe to remove. |
| 5 | **`net-tools` is unused** — provides `ifconfig`, `route`, `netstat`. No `rootfs/` script uses these. All network operations use `ip` (from `iproute2`, in the base image). | Searched all scripts: `20-inet`, `30-route`, `dockerNetworks` all use `ip`, not `ifconfig`/`route`. | Low — may be used for manual debugging. Owner decision. |
| 6 | **`iputils-ping` is unused** — no `rootfs/` script calls `ping`. | Searched all scripts. | Low — may be used for manual debugging. Owner decision. |
| 7 | **`wireguard` may be redundant** — the NordVPN `.deb` package likely depends on it (apt would auto-install) or bundles its own NordLynx. Explicit install may be a no-op. | Cannot verify without inspecting the NordVPN package dependencies. | Medium — removing could break NordLynx. **Test before removing.** |
| 8 | **`.dockerignore` is incomplete** — excludes `.git`, `.github`, `.img`, `*.md`, `LICENSE` but NOT `.ai/`, `docs/`, `scripts/`, `Taskfile.yml`, `.gitattributes`, `.ai-prime-*`. These are sent to the build daemon unnecessarily. | `.dockerignore` file. | None — safe to add exclusions. |
| 9 | **`nord_config` shebang is inconsistent** — `#!/usr/bin/with-contenv bash` (missing `/bin/` prefix). Other scripts use `#!/usr/bin/with-contenv /bin/bash`. Works on Noble (merged-usr) but non-standard. | `rootfs/usr/bin/nord_config` line 1. | None — works at runtime. |
| 10 | **`nord_watch` shebang is non-standard** — `#!/usr/bin/bash` instead of `#!/bin/bash`. Works on Noble (`/bin` → `/usr/bin` symlink) but inconsistent with all other scripts. | `rootfs/usr/bin/nord_watch` line 1. | None — works at runtime. |
| 11 | **`COPY /rootfs /`** — leading `/` on the source path is non-standard. Should be `COPY rootfs /`. Works but inconsistent with Docker conventions. | Dockerfile line 36. | None. |
| 12 | **No `HEALTHCHECK` instruction** — Docker/orchestrator has no way to know if the VPN is actually working. `nord_watch` acts as an internal watchdog but Docker reports the container as healthy as long as PID 1 is running. | Dockerfile — no `HEALTHCHECK` line. | Enhancement, not an optimization. Owner decision. |

## Revised recommendations

### Tier 1 — Clear wins, no behavior change (recommend implementing)

These are safe, proven improvements with no risk to runtime behavior:

1. **Remove `libc6` from the install list** — redundant, already in the base image.
2. **Set executable bits in git** for all `rootfs/` scripts via `git update-index --chmod=+x`, then remove the `chmod` block from the Dockerfile. This eliminates a build layer and makes the source the single source of truth for permissions. The current `chmod` block is also fragile — adding a new script requires updating the Dockerfile.
3. **Expand `.dockerignore`** to exclude `.ai/`, `docs/`, `scripts/`, `Taskfile.yml`, `.gitattributes`, `.ai-prime-version`, `.ai-prime-versions.json`. Reduces build context sent to the daemon.
4. **Fix `COPY /rootfs /`** → `COPY rootfs /` — standard Docker syntax.
5. **Fix shebang inconsistencies** in `nord_config` (`#!/usr/bin/with-contenv /bin/bash`) and `nord_watch` (`#!/bin/bash`) for consistency with the rest of the codebase.

### Tier 2 — Owner decision required (present tradeoffs, await approval)

6. **`apt-get upgrade -y`** — Docker best practice is to remove it (non-reproducible builds, larger image, slower). BUT: the owner has a constraint against bumping the base image without explicit instruction, so `upgrade` may be the security-patching mechanism. **Tradeoff**: reproducibility + size vs. security patches. **Recommendation**: remove it and instead document that the base image should be pulled fresh periodically (`docker build --pull`). But this is the owner's call.
7. **Remove `net-tools` and `iputils-ping`** — no script uses them. They're likely installed for debugging convenience. Removing them saves ~2 MB. **Tradeoff**: smaller image vs. losing `ping`/`ifconfig` for manual debugging inside the container.
8. **Test removing `wireguard`** — the NordVPN package may pull it in as a dependency automatically. **Approach**: remove it, run `task docker-build` + `task verify`, and specifically verify NordLynx connectivity. If it fails, add it back.
9. **Add `HEALTHCHECK`** — use the `data/check` pattern (socket existence) or a `nordvpn status` check. Lets Docker/Unraid report container health. **Tradeoff**: adds a check that runs every 30s; minimal overhead.

### Tier 3 — Future consideration (out of scope for this plan)

10. **BuildKit cache mounts** — `RUN --mount=type=cache,target=/var/cache/apt` caches apt packages across builds. Requires BuildKit (enabled by default in modern Docker). Minor build-speed improvement.
11. **Multi-stage build** — not applicable here (single runtime image, no build artifacts to discard).

## Scope — what's in / what's explicitly out

**In (Tier 1 — clear wins)**:
- Remove `libc6` from install list
- Set executable bits in git for `rootfs/` scripts, remove `chmod` block from Dockerfile
- Expand `.dockerignore` with additional exclusions
- Fix `COPY /rootfs /` → `COPY rootfs /`
- Fix shebang inconsistencies in `nord_config` and `nord_watch`

**In (Tier 2 — pending owner approval)**:
- Remove `apt-get upgrade -y` (owner decision)
- Remove `net-tools` and `iputils-ping` (owner decision)
- Test removing `wireguard` (test, then decide)
- Add `HEALTHCHECK` instruction (owner decision)

**Out**:
- Base image bump (requires explicit owner instruction)
- NordVPN version bump (out of scope)
- `Taskfile.yml` modifications (requires explicit owner instruction)
- Any changes to script logic in `rootfs/` (only shebang line fixes)
- BuildKit cache mounts (Tier 3, future)

## Changes — phase by phase

### Phase 1: Set executable bits in git (Tier 1)

Set the executable bit on all 18 non-executable `rootfs/` scripts so `COPY` preserves permissions:

```bash
git update-index --chmod=+x rootfs/etc/cont-init.d/00-firewall
git update-index --chmod=+x rootfs/etc/cont-init.d/00-version
git update-index --chmod=+x rootfs/etc/cont-init.d/10-tun
git update-index --chmod=+x rootfs/etc/cont-init.d/20-inet
git update-index --chmod=+x rootfs/etc/cont-init.d/20-inet6
git update-index --chmod=+x rootfs/etc/cont-init.d/30-route
git update-index --chmod=+x rootfs/etc/cont-init.d/30-route6
git update-index --chmod=+x rootfs/etc/cont-init.d/40-allowlist
git update-index --chmod=+x rootfs/etc/services.d/nordvpn/data/check
git update-index --chmod=+x rootfs/etc/services.d/nordvpn/finish
git update-index --chmod=+x rootfs/etc/services.d/nordvpn/run
git update-index --chmod=+x rootfs/usr/bin/dockerNetworks
git update-index --chmod=+x rootfs/usr/bin/dockerNetworks6
git update-index --chmod=+x rootfs/usr/bin/nord_config
git update-index --chmod=+x rootfs/usr/bin/nord_connect
git update-index --chmod=+x rootfs/usr/bin/nord_login
```

Note: `nord_watch` is already `100755` — no change needed.
Note: `notification-fd` and `type` are data files (not scripts) — do NOT set executable bit.

### Phase 2: Fix shebang inconsistencies (Tier 1)

- `rootfs/usr/bin/nord_config` line 1: `#!/usr/bin/with-contenv bash` → `#!/usr/bin/with-contenv /bin/bash`
- `rootfs/usr/bin/nord_watch` line 1: `#!/usr/bin/bash` → `#!/bin/bash`

### Phase 3: Expand `.dockerignore` (Tier 1)

Add these lines to `.dockerignore`:
```
.ai
docs
scripts
Taskfile.yml
.gitattributes
.ai-prime-version
.ai-prime-versions.json
```

### Phase 4: Refactor Dockerfile (Tier 1)

1. Remove `libc6` from the `apt-get install` list (line 22).
2. Remove the entire `chmod` block (lines 38-48).
3. Fix `COPY /rootfs /` → `COPY rootfs /` (line 36).
4. Keep `curl`, `iputils-ping`, `wireguard`, `net-tools` in the install list for now (Tier 2 decisions pending).
5. Keep `apt-get upgrade -y` for now (Tier 2 decision pending).

### Phase 5: (Pending owner approval) Tier 2 changes

Only after owner approves specific Tier 2 items:
- Remove `apt-get upgrade -y` (if approved)
- Remove `net-tools iputils-ping` from install list (if approved)
- Test removing `wireguard`, run `task verify`, add back if NordLynx fails (if approved)
- Add `HEALTHCHECK` instruction (if approved)

## Execution Order — step table with commit prefixes

| Step | Action | Tier | Commit Prefix |
|------|--------|------|---------------|
| 1 | Create branch `chore/dockerfile-optimization` from `main` | — | (branch creation) |
| 2 | Set executable bits in git for 17 `rootfs/` scripts | 1 | `chore: set executable bits on rootfs scripts` |
| 3 | Fix shebang inconsistencies in `nord_config` and `nord_watch` | 1 | `fix: normalize shebang lines in nord_config and nord_watch` |
| 4 | Expand `.dockerignore` with `.ai`, `docs`, `scripts`, etc. | 1 | `chore: expand .dockerignore exclusions` |
| 5 | Refactor Dockerfile: remove `libc6`, remove `chmod` block, fix `COPY` path | 1 | `chore: optimize Dockerfile — remove redundant libc6, chmod block, fix COPY path` |
| 6 | Run `task docker-build` + `task verify` | — | (validation, no commit) |
| 7 | Present results + Tier 2 decisions to owner | — | (await approval) |
| 8 | (Conditional) Implement approved Tier 2 changes | 2 | `chore: apply approved Tier 2 Dockerfile optimizations` |
| 9 | Run `task docker-build` + `task verify` again | — | (validation, no commit) |
| 10 | Update `.ai/current.md` and `.ai/SESSION_NOTES.md` | — | `docs: update handoff state` |

## Validation — what must pass before complete

- `task docker-build` completes without errors
- `task verify` passes all 4 checks:
  1. `IMAGE_VERSION` ENV = git hash
  2. `nordvpn --version` = NORDVPN_VERSION (5.1.0)
  3. iptables OUTPUT policy = DROP (kill-switch functional)
  4. nordvpnd socket present at `/run/nordvpn/nordvpnd.sock`
- All `rootfs/` scripts are executable inside the container (verify via `docker run --rm --entrypoint /bin/bash <image> -c "ls -la /usr/bin/nord_*"`)
- If Tier 2 `wireguard` removal is tested: NordLynx connectivity verified (not just socket existence — actual `nordvpn status` showing connected)

## Open Questions for owner

1. **`apt-get upgrade -y`**: Remove it (Docker best practice, smaller/faster builds, reproducible) or keep it (security patching since base image isn't bumped regularly)? **Recommendation**: remove it and instead use `docker build --pull` periodically to get a fresh base image.
2. **`net-tools` + `iputils-ping`**: Remove (no script uses them, saves ~2 MB) or keep for debugging convenience?
3. **`wireguard`**: Should we test removing it? The NordVPN package may auto-install it as a dependency. If it does, our explicit install is redundant.
4. **`HEALTHCHECK`**: Add a Docker `HEALTHCHECK` instruction (e.g., `nordvpn status` or socket check) so Docker/Unraid can report container health? Currently the container reports healthy as long as PID 1 runs, even if the VPN is down.
