# Dockerfile Follow-up Review

Created: 2026-07-11 | Status: Pending review

## Background

The owner asked whether `Dockerfile` (52 lines) looks well-built. A targeted review
identiâted the image as ~85% solid: digest-pinned base, OCI labels, hardened curl
fetch, single-cache-clean `RUN`, `COPY --chmod=0755`, HEALTHCHECK, and optional
NordVPN version pinning. Five follow-up concerns surfaced; two have been resolved
by prior work (`dockerfile-optimization.md` and `dockerfile-optimizations-1.md`,
both completed per the 2026-06-26 changelog entry), and the remaining three are
net-new operational findings worth implementing or deciding on.

This plan mirrors those two prior plans in structure but covers only what is
**still open** against the current `Dockerfile` state (read at `HEAD` in this
session). It is deliberately scoped to Dockerfile-only changes; no `rootfs/`
script logic changes, no base image bumps, no NordVPN version bumps.

## What was reviewed

- `Dockerfile` (every line, at current `HEAD`)
- `README.md` changelog (2026-06-26 entry describing the optimizations already
  landed)
- `.ai/plans/dockerfile-optimization.md` and `.ai/plans/dockerfile-optimizations-1.md`
  (prior plans, marked completed)
- `.ai/current.md` (Future Work note explicitly parks `apt-get upgrade`
  reconsideration until the base-refresh cadence has run a few times)
- `.ai/rules/engineering-rules.md` (commit prefix convention: `chore(dockerfile):`)

## Findings — already-done vs. still-open

### Already resolved (do not re-implement)

Per the 2026-06-26 changelog entry and the two prior optimization plans:

| Earlier finding | Resolution | Source |
|---|---|---|
| Redundant `libc6` install | Removed from install list | changelog 2026-06-26 |
| Separate `chmod` RUN block (10 lines) | Replaced with `COPY --chmod=0755 rootfs /` (Dockerfile:45) | changelog 2026-06-26 |
| `wireguard` metapackage | Replaced with `wireguard-tools` (Dockerfile:25) | changelog 2026-06-26 |
| `nordvpn-release` version hardcoded in URL | Extracted to `ARG NORDVPN_RELEASE` (Dockerfile:8, used Dockerfile:27) | changelog 2026-06-26 |
| Inconsistent shebangs in `nord_config` / `nord_watch` | Fixed | changelog 2026-06-26 |
| Non-standard `COPY /rootfs /` path | Now `COPY --chmod=0755 rootfs /` (Dockerfile:45) | changelog 2026-06-26 |
| Incomplete `.dockerignore` | Expanded | changelog 2026-06-26 |
| No `HEALTHCHECK` | Added (Dockerfile:49-50) | changelog 2026-06-26 |
| Curl bootstrap hardened with `--proto '=https' --tlsv1.2` | Added (Dockerfile:26) | changelog 2026-06-26 |

These items are explicitly out of scope for this plan.

### Still-open findings (this plan's scope)

| # | Finding | Evidence | Risk | Tier |
|---|---|---|---|---|
| 1 | **`apt-get upgrade -y` contradicts the digest pin** | `Dockerfile:24` â base image is pinned to `noble@sha256:99ecdbâ¦` (`BASE_DIGEST`, Dockerfile:1-2) but the first action inside the `RUN` is to upgrade every package, so the final runtime does not match the pinned base. | Conflicting intent. Also flagged as Future Work in `.ai/current.md`. | 2 (owner decision â security/reproducibility tradeoff) |
| 2 | **Missing `--no-install-recommends`** | `Dockerfile:25` â `apt-get install -y curl iptables iputils-ping wireguard-tools net-tools` has no `--no-install-recommends` flag, pulling recommended (not required) packages into the image. | Larger image, larger attack surface. Was Phase 1 of `dockerfile-optimizations-1.md` but the changelog summary does not confirm it landed; current Dockerfile shows it has not. | 1 (safe â fall back to adding it back if a required recommend is missing) |
| 3 | **Shell-form `CMD` chain leaves `nord_watch` unable to receive `SIGTERM`** | `Dockerfile:52` â `CMD nord_login && nord_config && nord_connect && nord_watch` evaluates under `/bin/sh -c`. PID 1 is `/bin/sh`, not `nord_watch`. When Docker sends `SIGTERM` (e.g. `docker stop`, Unraid shutdown), `sh` does not forward the signal to `nord_watch`, so NordVPN's graceful disconnect path is bypassed and the container hits the 10-second kill timeout. | Operational: slow/unclean shutdowns on Unraid; no impact on running state. LSIO base ships s6-overlay (already used for `services.d/nordvpn`) which is the idiomatic answer. | 2 (owner decision â changes container shutdown behavior) |
| 4 | **No version pinning for utility packages** | `Dockerfile:25` â `curl`, `iptables`, `iputils-ping`, `wireguard-tools`, `net-tools` are installed without `=version` pins, so successive builds drift even when `BASE_DIGEST` is pinned. | Reproducibility gap. Only NordVPN is version-pinned (Dockerfile:31, via `${NORDVPN_VERSION:+=$NORDVPN_VERSION}`). | 3 (future â low value given the upgrade-every-build pattern above; revisit if/when `apt-get upgrade` is removed) |

### Open discrepancy (not a finding, but worth flagging)

The 2026-06-26 changelog entry claims `net-tools`/`iputils-ping`/`libc6` were
"removed" from the install list, but the current `Dockerfile:25` still installs
`iputils-ping` and `net-tools` (only `libc6` is actually gone). Either the
changelog entry was inaccurate, or these were re-added in a later change without
a corresponding changelog note. **Out of scope for this plan**; flagged here only
so the next maintainer does not trust the changelog summary over the source. Per
AGENTS.md the source is runtime truth.

## Scope

### In scope (this plan)

- Phase 1 (Tier 1): add `--no-install-recommends` to the `apt-get install` call.
- Phase 2 (Tier 2, **owner approval required**): remove `apt-get upgrade -y`.
- Phase 3 (Tier 2, **owner approval required**): migrate the `CMD` chain to s6
  services (or, as a smaller fallback, convert to exec form so `nord_watch`
  becomes PID 1).

### Explicitly out of scope

- Any change to `rootfs/` script logic (shebang fixes are already done).
- Any base image bump or NordVPN version bump.
- Any `Taskfile.yml` modification.
- Pinning utility package versions (Tier 3 / future).
- Reconciling the 2026-06-26 changelog discrepancy (flagged above only).
- Re-running earlier optimization-plan items (libc6, chmod block, wireguard
  metapackage, OCI labels, HEALTHCHECK â all landed already).

## Changes â phase by phase

### Phase 1: Add `--no-install-recommends` (Tier 1)

- **File**: `Dockerfile`
- **Line**: 25
- **Change**: `apt-get install -y curl iptables iputils-ping wireguard-tools net-tools`
  â `apt-get install -y --no-install-recommends curl iptables iputils-ping wireguard-tools net-tools`
- **Why**: Reduces image size and attack surface by skipping recommended-but-not-required
  packages. The base image already pulls in critical recommends (e.g. `iproute2`)
  via its own dependencies, so the explicit packages here stay available.
- **Risk**: If a recommend is actually required by one of the explicit packages,
  `task verify` will surface it â fallback is to remove the flag, not to add
  individual recommends back iteratively.

### Phase 2: Remove `apt-get upgrade -y` (Tier 2 â owner approval gate)

- **File**: `Dockerfile`
- **Line**: 24
- **Change**: Delete `apt-get upgrade -y && \` so the only `apt-get update`
  before installs is the existing one feeding `apt-get install`.
- **Why**: With `BASE_DIGEST` pinned, `upgrade` makes the runtime not match the
  pinned base, defeating the purpose of the digest. The owner's monthly
  base-image digest-check pipeline (`.github/workflows/check-base-image.yml`,
  per changelog 2026-06-27) is the intended patching cadence going forward.
- **Owner tradeoff**: If `apt-get upgrade` is the only thing keeping known-CVE
  packages patched between base-refresh merges, removing it widens the window.
  Per `.ai/current.md`, the owner already plans to "evaluate whether to remove
  `apt-get upgrade` from the Dockerfile to improve local build reproducibility"
  once the base-refresh cadence has run a few times. **This plan defers to the
  owner on whether that point has been reached.**
- **Bump**: Per the new `build-validate.yml` hard-fail guard (Phase B of the
  version-logs-release-gap work, changelog 2026-07-10), any `Dockerfile` change
  merged without an `IMAGE_VERSION` bump fails CI. This phase **must** bump
  `ARG IMAGE_VERSION` (Dockerfile:7) and `README.md` Changelog entry in the same
  commit. Examples: `5.5.5` â `5.5.6` with summary "Remove `apt-get upgrade`
  from Dockerfile to honor the digest-pinned base image."

### Phase 3: Migrate `CMD` chain to s6 services (Tier 2 â owner approval gate)

Two viable implementations; **owner picks which**:

**Option A â s6 services (recommended)**:
- Move `nord_login`, `nord_config`, `nord_connect` into `rootfs/etc/cont-init.d/`
  as ordered one-shot init scripts (they already run sequentially and
  short-circuit fail-closed per the README "Restart policy required" note).
- Move `nord_watch` into `rootfs/etc/services.d/nordvpn/run` (it is the
  long-running daemon â and s6 already manages `services.d/nordvpn/` per the
  existing `data/check`, `finish`, `run` files), with `run` dropping privileges
  and `exec`ing `nord_watch` so s6 supervises it and forwards signals.
- Delete the `CMD` line (Dockerfile:52); let the LSIO base image's default
  `CMD`/`ENTRYPOINT` (`/init`) start s6, which then runs `cont-init.d/*` then
  `services.d/*`.
- **Why this is the idiomatic LSIO pattern**: the base image already ships s6 and
  the existing `services.d/nordvpn/{data/check,finish,run}` files use it. The
  shell-form `CMD` chain bypasses s6 for the startup sequence, then re-enters it
  via `nord_watch` â a mixed architecture that's the root cause of the
  signal-handling gap.

**Option B â exec-form `CMD` (smaller change, partial fix)**:
- Convert `Dockerfile:52` to exec form. Because the startup is a sequential
  chain, this requires wrapping the four calls in a single script (e.g.
  `rootfs/usr/bin/nord_start` that does `nord_login && nord_config && nord_connect
  && exec nord_watch`) and using `CMD ["nord_start"]`. The `exec` makes
  `nord_watch` replace the shell as PID 1, so it sees `SIGTERM` directly.
- **Tradeoff vs. Option A**: smaller diff, no `cont-init.d` move, but still mixes
  shell-orchestration with s6 service management. Half-measure but low-risk.

**Bump**: same as Phase 2 â `IMAGE_VERSION` bump + README Changelog entry
required by the `build-validate.yml` guard.

## Execution Order

| Step | Phase | Action | Commit prefix |
|---|---|---|---|
| 1 | â | Create branch `chore/dockerfile-followup` from `main` | (branch creation) |
| 2 | 1 | Add `--no-install-recommends` to `apt-get install` | `chore(dockerfile):` |
| 3 | â | `task docker-build` + `task verify` | validation |
| 4 | â | Stop. Present validator results + Phase 2/3 decision tree to owner | (await approval) |
| 5 | 2 (if approved) | Remove `apt-get upgrade -y`, bump `IMAGE_VERSION`, add Changelog entry | `chore(dockerfile):` |
| 6 | â | `task docker-build` + `task verify` | validation |
| 7 | 3 (if approved) | Implement Option A (s6 services) or Option B (exec-form `CMD`) per owner's choice, bump `IMAGE_VERSION`, add Changelog entry | `refactor(dockerfile):` |
| 8 | â | `task docker-build` + `task verify` (and, if Option A, an actual Unraid-style `docker stop` test to confirm clean `SIGTERM` handling) | validation |
| 9 | â | Update `.ai/current.md` and `.ai/SESSION_NOTES.md` per session-close protocol | `docs(handoff):` |

Per-phase `Status` (`Pending` / `Done`) is tracked in this table's Status
column by adding a `/Done` marker next to the row when committed. Top-level
`Status` field at the top of this plan flips to `Complete` only after the
final push is approved and confirmed.

## Validation

Every phase that touches `Dockerfile` must pass:

- `task docker-build` completes without errors.
- `task verify` passes all checks (3 pass / 0 fail / 1 known WARN for the
  fake-token container exit â same baseline as the 2026-07-10 final gate).
- If Phase 2 removes `apt-get upgrade`: re-confirm `nordvpn --version` still
  reports `${NORDVPN_VERSION}` (i.e. removing upgrade did not strip a transitive
  dependency NordVPN needs).
- If Phase 3 Option A is chosen:
  - All `rootfs/` scripts in `cont-init.d/` and `services.d/` are executable
    inside the container (spot-check via
    `docker run --rm --entrypoint /bin/bash <image> -c "ls -la /etc/cont-init.d/ /etc/services.d/nordvpn/"`).
  - Clean-shutdown test: `docker stop <container>` exits within 2-3 seconds (not the
    10s default kill timeout). This is the core signal-handling fix.
- `build-validate.yml` "image-only bump" guard passes (i.e. `IMAGE_VERSION` was
  bumped whenever `Dockerfile` changes â Phases 2 and 3 both bump it).

## Open Questions for owner

1. **Phase 1 (`--no-install-recommends`)**: Implement immediately as a Tier 1
   safe win? It is low-risk and reversible; can land standalone before any
   owner decision is required on the other phases.
2. **Phase 2 (`apt-get upgrade`)**: Has the monthly base-refresh cadence run
   enough times that you're comfortable removing `apt-get upgrade -y` and
   trusting the digest pipeline as the sole patching mechanism? (Per
   `.ai/current.md` Future Work note, this is your call.) If "not yet," Phase 2
   is parked and only Phase 1 + optionally Phase 3 proceed.
3. **Phase 3 (`CMD` signal handling)**: Do you want the full idiomatic fix
   (Option A â move startup scripts to `cont-init.d/` and `nord_watch` to
   `services.d/nordvpn/run`, drop the `CMD` line entirely), or the smaller
   half-measure (Option B â `exec`-wrap the chain into a single script and use
   exec-form `CMD`)? Option A is more work but matches the LSIO base image's
   existing s6 architecture; Option B is a 10-line diff that fixes the
   signal-handling bug without restructuring.
4. **Changelog discrepancy (out of scope)**: The 2026-06-26 changelog claims
   `net-tools`/`iputils-ping` were removed; the current Dockerfile still
   installs them. Want a separate one-line chore to fix the changelog entry
   (or, alternatively, to remove the packages if that was the original
   intent)? Logged here only for awareness; not blocking this plan.