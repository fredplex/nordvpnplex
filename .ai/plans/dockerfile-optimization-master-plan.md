# Dockerfile Optimization — Master Plan (Synthesis of 3 Sources)

Created: 2026-06-26 | Status: All 7 open questions resolved (2026-06-26) — ready for implementation pending go-ahead

> **Provenance**: This is the *definitive synthesis* of three independent sources, reconciled
> by a principal-level audit. It supersedes the three inputs for execution purposes; the
> inputs are retained as the decision record.
>
> | Source | File | Character |
> |---|---|---|
> | **Independent Review** | `.ai/plans/dockerfile-security-review.md` | Isolated security/DevOps audit (2026-06-26) |
> | **Plan A** | `.ai/plans/dockerfile-optimizations-1.md` | Early, shallow size/speed pass (2026-06-23) |
> | **Plan B** | `.ai/plans/dockerfile-optimization.md` | Deep two-pass, file-cross-referenced plan (2026-06-25) |
>
> **Facts in this plan were re-verified against the live tree** (git index modes, `services.d`
> data files, shebangs, `.dockerignore`, and a `rootfs/` grep for legacy net tools) — not
> inherited from the sources. **The build process and artifacts were also reviewed first-hand**
> (`Taskfile.yml`, `scripts/verify.sh`, `scripts/bump.sh`, `scripts/dev-build.sh`, and all three
> GitHub Actions workflows) — see **STEP 1.5**, which confirmed the BuildKit/`COPY --chmod`
> dependency, exposed a `task verify` blind spot, and surfaced an accidental-release CI risk.
> Verification notes are inline.
>
> **⭐ EMPIRICALLY VALIDATED 2026-06-26** — built baseline + 3 candidate images and ran a
> real-token NordVPN connect + Spain-egress test. Full results:
> `.ai/experiments/2026-06-26-dockerfile-optimization-validation.md`. Key outcomes: `COPY --chmod`
> works (F3); **`--no-install-recommends` broke the kill switch (F4)** for <1% size (F7);
> `wireguard`/`wireguard-tools` are **not required** for NordLynx (F5/F6); the `# syntax`
> directive must be removed (F2). The Dockerfile and verdicts below reflect these findings.

---

## Owner Decisions Log

Resolutions to the Open Questions, recorded as the owner answers them.

| # | Question | Decision (date) | Effect on plan |
|---|----------|-----------------|----------------|
| Q1 | `apt-get upgrade` — keep vs. remove + base-refresh cadence | **Keep as-is for now** (2026-06-26) | No Dockerfile change. Future task logged: adopt a base-refresh cadence (couples with the Phase 3 digest pin), then revisit removal. |
| Q2 | `CMD` `&&` chain — leave as-is vs. harden | **Leave as-is** (2026-06-26) | No Dockerfile change. New scoped item: add a `--restart=unless-stopped` note to README/user-guide (the chain's recovery safety net). |
| Q3 | `HEALTHCHECK` — add it / accept Unraid health reporting | **Approved** (2026-06-26) | Add the HEALTHCHECK as specified. Grep string `Status: Connected` validated (F10); connect observed ~5s ≪ 45s start-period. Phase 5 validation step: observe the healthy↔unhealthy transition in a longer run before shipping. |
| Q4 | Local BuildKit — implicit default vs. explicit `DOCKER_BUILDKIT=1` | **Adopt explicit** (2026-06-26) | Set `DOCKER_BUILDKIT=1` via Task's `env:` key (recommend top-level `env:` so `docker-build`/`dev-build` and the scripts they invoke inherit it). Touches `Taskfile.yml` — owner sign-off given for that edit at implementation. Guarantees `COPY --chmod` never regresses on a legacy/misconfigured builder; portable across Win/Mac/Linux. |
| Q5 | `net-tools` + `iputils-ping` — keep removed vs. re-add for debugging | **Keep removed** (2026-06-26) | Confirms current Dockerfile (already omits both). ~0.35 MB saved; `ip`/`curl` remain for in-container diagnostics. |
| Q6 | Pristine modes — accept inert 0755 vs. split the COPY | **Accept** (2026-06-26) | Single `COPY --chmod=0755 rootfs /`. Inert 0755 on `type`/`notification-fd` is harmless (s6 reads by content; verified F3). No split. |
| Q7 | `verify.sh` false failures on Windows/Git Bash (F1) | **Fix the script** (2026-06-26) | Add `export MSYS_NO_PATHCONV=1` + `export MSYS2_ARG_CONV_EXCL='*'` near the top of `scripts/verify.sh` (no-ops on Linux/Mac). Touches a tooling file — sign-off given. Makes `task verify` work in Git Bash without WSL2 or a manual prefix. |

---

## STEP 1 — Audit & Validation Matrix

### 1A. Direct Conflicts (with verdicts)

#### Conflict 1 — `apt-get upgrade -y`: remove vs. keep-as-decision

| Source | Position |
|---|---|
| Plan A | **Remove it flatly** ("non-reproducible, larger, slower") |
| Plan B | **Owner decision / tradeoff** — may be the only security-patching channel |
| Independent Review | **Owner decision / tradeoff** — same reasoning |

**VERDICT: Plan B + Independent Review win. Plan A is wrong here.** Plan A optimizes for
reproducibility in isolation and ignores the governing constraint (`AGENTS.md` Key
Boundaries: the base image is deliberately *not* bumped without instruction). With a pinned
base, `apt-get upgrade` is plausibly the **only** mechanism patching OS-level CVEs between
NordVPN bumps. Flat removal silently degrades security posture. It is a deliberate tradeoff,
not a free win. *If* removed, it must be paired with a base-refresh cadence (see Conflict 1
interaction with digest pinning, below).

#### Conflict 2 — The `chmod` block: `COPY --chmod` vs. git exec-bits vs. globbed `RUN`

| Source | Mechanism |
|---|---|
| Plan A | `COPY --chmod=0755 /rootfs /` (stamp mode at copy time) |
| Plan B | `git update-index --chmod=+x` on 17 files, then delete the `chmod` block; plain `COPY` |
| Independent Review | Keep a `RUN chmod` but collapse to globs |

**VERDICT: Adopt Plan A's *mechanism* (`COPY --chmod`), corrected with Plan B's data-file
awareness. This overrides my own Independent Review.** Reasoning — the decisive factor none
of the three weighed fully is the **mixed build matrix**: the owner builds locally on
**Windows** (NTFS has no Unix exec bit) while CI builds on **Linux**.

- **Plan B (git bits)** is the cleanest "source of truth," but it is **fragile for local
  Windows builds**: the bit lives in the git index, yet `docker build` copies from the
  *working tree*, and a Windows working tree cannot carry an exec bit. The current Dockerfile
  almost certainly has an explicit `chmod` block *precisely because* COPY-preserved
  permissions are unreliable on Windows. Plan B would regress local builds unless Docker
  Desktop happens to stamp 0755.
- **Plan A (`COPY --chmod=0755`)** stamps the mode **explicitly at copy time**, so it is
  **deterministic on both Windows and Linux** — it removes the host-OS dependency entirely
  and drops the extra `RUN` layer. This is the robust choice.
- **Independent Review (globbed `RUN`)** is safe but keeps a redundant layer and the
  "remember to update it" fragility. Inferior to `--chmod`.

**Verified fact (live `git ls-files --stage rootfs/`)**: 18 of 19 files are `100644`; only
`nord_watch` is `100755`. And `services.d/nordvpn/{type,notification-fd}` **do exist** as data
files. A blanket `COPY --chmod=0755 rootfs /` therefore stamps those two data files
executable. **This is functionally inert** — s6-rc reads `type` ("longrun") and
`notification-fd` ("3") by *content*; the exec bit is never consulted. Acceptable. If pristine
modes are desired, split into two COPYs (documented in the master Dockerfile).

#### Conflict 3 — `wireguard`: keep vs. swap-to-`wireguard-tools` vs. test-removal

| Source | Position |
|---|---|
| Plan A | Replace `wireguard` → `wireguard-tools` (unconditionally) |
| Plan B | **Test removing it entirely** (NordVPN `.deb` may auto-pull it) |
| Independent Review | Keep `wireguard` (didn't flag it) |

**VERDICT: Sequence them — Plan B's method first, Plan A's insight as the fallback, Review's
keep as the floor.** The empirically correct order:
1. **Test full removal** (Plan B) — if NordLynx still connects, smallest surface wins.
2. **If it breaks → add `wireguard-tools`** (Plan A's real insight: the full `wireguard`
   *metapackage* drags in kernel-module/dkms cruft that is useless in a container; the kernel
   side comes from the host. `wireguard-tools` is the precise userspace dependency).
3. **Never** ship the full `wireguard` metapackage, and **never** swap blind without a
   connectivity test (Plan A's unconditional swap is unsafe; Review's untested keep is the
   safe default only until tested).

> **UPDATE — validated 2026-06-26 (F5/F6):** `wireguard-tools` connects via NordLynx; Nord's
> `.deb` runs NordLynx with **no** wireguard package at all. Recommendation: drop the full
> metapackage; keep `wireguard-tools` as cheap insurance (~0.1 MB) rather than rely on the
> implicit bundle staying present across NordVPN releases.

#### Conflict 4 — `--no-install-recommends`: add vs. exclude

| Source | Position |
|---|---|
| Plan A | Add it (size win) |
| Plan B | **Exclude** ("could break NordVPN... too risky without testing") |
| Independent Review | Add it (with a verify caveat) |

**VERDICT: Plan A + Review win on direction; Plan B's caution is folded in as a gate, not a
veto.** `--no-install-recommends` is standard good practice and only skips `Recommends:` (hard
`Depends:` are always installed). The genuine risk is narrow: NordVPN mis-classifying a real
need as a Recommend. That is **testable**, so the right move is *apply + verify a real
connect* — not exclude outright. Plan B over-rotated to caution. **Caveat retained**: the
`--no-install-recommends` on the **`nordvpn` install line specifically** is the single
riskiest token in the whole plan; Phase 4 gates it on a real NordLynx egress test, with a
documented fallback (drop the flag from that one line).

> **UPDATE — validated 2026-06-26 (F4/F7): Plan B was right.** `--no-install-recommends`
> silently removed `iptables` and **broke the kill switch**, for **<1%** image-size benefit.
> Revised verdict: **do not use `--no-install-recommends` here.** If ever reintroduced,
> `iptables` (and any other critical implicit dependency) must be listed explicitly. Plan A's
> direction is rejected on evidence; my own "apply + test" framing was the right *process* but
> the *outcome* is rejection.

### 1B. Redundancies & Overlaps (consensus — high confidence)

| Agreement | Sources | Disposition |
|---|---|---|
| The per-file `chmod` block is bad in its current form | All 3 | Replace (see Conflict 2) |
| **No multi-stage build** | All 3 (A: out-of-scope; B: Tier 3 "N/A"; Review: "does not apply") | Rejected by consensus |
| Remove redundant `libc6` | B + Review | Adopt (Phase 1) |
| Fix `COPY /rootfs /` → `COPY rootfs /` | B + Review (A implicitly) | Adopt (Phase 2) |
| Add a `HEALTHCHECK` (`nordvpn status` grep) | B + Review (near-identical) | Adopt (Phase 5) |
| `apt-get upgrade` is not a trivial removal | B + Review | Adopt (Conflict 1) |
| `curl` stays in the final image (runtime dep via `nord_watch`) | B explicit, Review implicit | Settled — do not remove curl |

### 1C. Invalid / Suboptimal Advice (called out)

**Plan A:**
- ❌ **Flat `apt-get upgrade` removal** — ignores the base-pinning constraint (Conflict 1).
- ⚠️ **`COPY --chmod=0755 /rootfs /` keeps the leading slash** — contradicts the very path
  cleanup the change implies; should be `rootfs`.
- ⚠️ **Unconditional `wireguard` → `wireguard-tools`** without a NordLynx test (Conflict 3).
- ❌ **Self-described "Zero runtime behavioral change" is false.** Removing `apt-get upgrade`,
  swapping the WireGuard package, *and* adding `--no-install-recommends` all change image
  **contents** and potentially behavior. Mis-labeling behavior-affecting changes as inert is
  the most dangerous claim across all three sources — it would discourage the runtime testing
  those changes actually require.

**Plan B:**
- ⚠️ **Excluding `--no-install-recommends` entirely** — over-cautious; it is testable
  (Conflict 4).
- ⚪ **Gaps (not errors)**: missed the `curl` supply-chain hardening, the base-image **digest
  pin**, and the `maintainer` typo. These are additive, caught by the Independent Review.

**Independent Review (self-audit, for symmetry):**
- ⚠️ **Globbed `RUN chmod` was suboptimal** vs. `COPY --chmod` (Conflict 2) — corrected here.
- ⚪ **Gaps**: missed `.dockerignore` expansion and the shebang inconsistencies (both from
  Plan B), and the `wireguard-tools` refinement (Plan A). Filled here.

**Consensus rejections (all three, restated):**
- **Multi-stage build** — no build artifacts to discard; the one build-ish tool (`curl`) is
  also a runtime dependency. Zero benefit, added complexity.
- **Non-root `USER`** (Independent Review) — would break the init chain; the container needs
  `CAP_NET_ADMIN`/`NET_RAW` to set the kill switch and create `tun`. Hardening belongs at the
  *run* command (`--cap-add` over `--privileged`), not the Dockerfile.

---

## STEP 1.5 — Build-Process & Artifact Verification (first-hand)

The three sources (and my own Independent Review) reasoned mostly about the Dockerfile and the
`rootfs/` artifacts. This section records a **first-hand read of the build tooling and CI** —
`Taskfile.yml`, `scripts/verify.sh`, `scripts/bump.sh`, `scripts/dev-build.sh`, and the three
GitHub Actions workflows — because several recommendations have hard dependencies on *how the
image is actually built and validated*. Each finding confirms, sharpens, or corrects the plan.

### a) BuildKit availability — decides whether `COPY --chmod` is even legal
- **CI: confirmed safe.** `build-validate.yml`, `publish.yml`, and `publish-dev.yml` all use
  `docker/setup-buildx-action@v3` + `docker/build-push-action@v6` → always BuildKit. `COPY
  --chmod` and the `# syntax` directive are honored.
- **Local: works-by-default but UNENFORCED.** `Taskfile.yml:30` (`task docker-build`) and
  `dev-build.sh:23` call **plain `docker build`** with no `DOCKER_BUILDKIT=1`. On Docker Desktop
  24+ BuildKit is the default, so `--chmod` works — but it is *implicit*. Under a legacy builder
  it is an "unknown flag" error (loud, safe failure — never silent). Forcing it would require
  editing `Taskfile.yml`, which the project rules forbid without explicit instruction. **DECIDED
  2026-06-26 (Q4): adopt — set `DOCKER_BUILDKIT=1` via Task's `env:` key** (owner sign-off given).

### b) `task verify` is BLIND to the exact failure modes Phase 4 risks — *most important finding*
`scripts/verify.sh` does **not** validate a real VPN connection:
- Check 4 starts the container with a **fake token** (`TOKEN=verify_smoke_test`, `verify.sh:84`)
  and only checks the **nordvpnd socket** exists after 12s — the tunnel never connects.
- A missing socket or an exited container is a **WARN, not a FAIL** (`verify.sh:97,101`), and the
  exit gate is `[[ FAIL -eq 0 ]]` (`verify.sh:113`) → **warnings pass.**
- Checks 1–3 don't need the daemon (Check 2 runs the CLI under `--entrypoint /bin/bash`).

**Consequence:** a Phase 4 change that strips a lib the daemon needs (`--no-install-recommends`)
or drops a package NordLynx needs (`wireguard`) can leave `task verify` **fully green** while the
daemon fails to start or the tunnel never establishes. The automated suite **cannot** catch either
mode. So the **manual real-token connect + egress-IP test is the ONLY safety net for Phase 4, and
is mandatory** — the same end-to-end check the 5.1.0 release used (real connect + Madrid exit IP).

### c) Version-injection build contract — confirmed compatible (not assumed)
`bump.sh:36-37`, the `release`/`dev-push` tasks, `dev-build.sh:14-15`, and all three workflows read
the pinned versions by grepping `ARG NORDVPN_VERSION='…'` / `ARG IMAGE_VERSION='…'` and editing via
`sed`. The master Dockerfile keeps both lines **byte-identical and in place**, and the new
`ARG NORDVPN_RELEASE` does not match those greps → the bump/release/CI contract is preserved.

### d) NEW high-severity CI/CD risk — accidental production release on merge
`publish.yml` triggers on **push to `main` filtered by `paths: [Dockerfile]`** (`publish.yml:12-15`),
then decides release-vs-bypass with
`git diff HEAD~1 HEAD -- Dockerfile | grep -qE '^\+ARG (NORDVPN|IMAGE)_VERSION='` (`publish.yml:67`).
Because **every phase edits the Dockerfile**, merging the optimization PR *will run* `publish.yml`.
It bypasses the release **only** while the two `ARG *_VERSION` lines stay byte-identical (appearing
as unchanged context, not `+` additions). **If implementation reorders, reformats, or re-quotes
those two lines, the guard fires and pushes `fredplex/nordvpn:latest` to Docker Hub.** Mitigation:
treat the two version ARG lines as frozen; never let them appear on the `+` side of the diff.

---

## STEP 2 — Master Optimized Dockerfile

Merged best-of-all-worlds. Inline comments cite the winning source and the "why over the
alternative." Behavior-affecting lines are marked `# [TEST]` and gated in the roadmap.

```dockerfile
# NO '# syntax' directive — validated 2026-06-26 (experiment F2): it forced a
#   docker/dockerfile:1 frontend pull that 401'd, and 'COPY --chmod' needs no directive on
#   modern BuildKit (Docker 24+/buildx). Baseline + all candidates built fine without it.

# [Independent Review] Pin the base by DIGEST for reproducibility + supply-chain integrity.
#   Resolve once:  docker buildx imagetools inspect ghcr.io/linuxserver/baseimage-ubuntu:noble
#   then append @sha256:<digest>. Digest-pinning ENFORCES "don't bump the base" — it freezes
#   the exact image rather than weakening the rule. (Tag kept; digest resolved at apply time.)
FROM ghcr.io/linuxserver/baseimage-ubuntu:noble

# [Independent Review] Fix maintainer typo: fredplexx -> fredplex (matches vendor/source).
LABEL maintainer="fredplex@gmail.com"

ARG NORDVPN_VERSION='5.1.0'
ARG IMAGE_VERSION='5.5.1'
# [Plan A, optional] Extract the repo bootstrap-package version to an ARG for maintainability.
ARG NORDVPN_RELEASE='1.0.0'

# OCI labels — externally queryable without running the container.
LABEL org.opencontainers.image.title="nordvpn-unraid" \
      org.opencontainers.image.description="NordVPN Linux client Docker image for Unraid" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.vendor="fredplex" \
      org.opencontainers.image.source="https://github.com/fredplex/nordvpnplex"

ENV IMAGE_VERSION=${IMAGE_VERSION}

# ARG (not ENV) so the noninteractive setting does not persist into the final image.
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && \
    # [DECISION 2026-06-26 — owner: KEEP as-is for now] 'upgrade' is the security-patching
    # channel while the base is intentionally pinned. FUTURE TASK: adopt a base-refresh
    # cadence (couples with the digest pin), then revisit removing this. See Decisions Log.
    apt-get upgrade -y && \
    # VALIDATED 2026-06-26. 'iptables' is EXPLICIT — the kill switch must never be implicit
    #   (F4: '--no-install-recommends' silently dropped iptables and broke the kill switch).
    # 'wireguard' -> 'wireguard-tools': metapackage unnecessary; NordLynx connected (F5). Nord's
    #   .deb runs NordLynx even with NO wireguard pkg (F6) — tools kept as cheap insurance.
    # '--no-install-recommends' DROPPED: it saved <1% (F7) for real risk (F4) — not worth it.
    # Also dropped: libc6 (in base), net-tools + iputils-ping (unused; keep-removed confirmed Q5).
    apt-get install -y curl iptables wireguard-tools && \
    # [Independent Review] Hardened fetch: -f fails on HTTP>=400 (no silent 404->junk .deb),
    #   -S surfaces errors, -L follows redirects, protocol + TLS floor pinned.
    curl -fsSL --proto '=https' --tlsv1.2 \
        "https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn-release/nordvpn-release_${NORDVPN_RELEASE}_all.deb" \
        --output /tmp/nordrepo.deb && \
    apt-get install -y /tmp/nordrepo.deb && \
    apt-get update -y && \
    # nordvpn itself is signature-verified by apt via the repo installed above.
    # '--no-install-recommends' DROPPED here too (F7: negligible payoff, and NIR is exactly
    #   what stripped iptables in F4). Keep nordvpn's recommends to avoid another silent loss.
    apt-get install -y nordvpn${NORDVPN_VERSION:+=$NORDVPN_VERSION} && \
    apt-get remove -y nordvpn-release && \
    apt-get autoremove -y && \
    # [Independent Review] 'clean' (was 'autoclean') empties the whole package cache.
    apt-get clean -y && \
    # Cleanup in the SAME layer so the bytes never persist in a lower layer.
    rm -rf \
        /tmp/* \
        /var/cache/apt/archives/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

# [Conflict 2 — Plan A mechanism, corrected] 'COPY --chmod' stamps the mode explicitly at
# copy time -> DETERMINISTIC on Windows (NTFS has no exec bit) AND Linux CI, and removes the
# separate 'RUN chmod' layer. Chosen over Plan B's git-exec-bits (clean on Linux but fragile
# for local Windows builds) and over the Review's extra chmod RUN layer.
# Path fixed to 'rootfs' (no leading slash). NOTE: the two data files (type, notification-fd)
# receive an inert 0755 — s6 reads them by content, so the exec bit is harmless. DECIDED
# 2026-06-26 (Q6): ACCEPT this — single COPY, no split.
COPY --chmod=0755 rootfs /

ENV S6_CMD_WAIT_FOR_SERVICES=1

# [Plan B + Review] HEALTHCHECK surfaces REAL tunnel state to Docker/Unraid. nord_watch's
# internal s6 restarts were invisible to the orchestrator. APPROVED 2026-06-26 (Q3).
# Validated: "Status: Connected" wording matches the 5.1.0 client (F10); connect observed ~5s,
# well under the 45s start-period. Phase 5 still: watch the healthy<->unhealthy flip in a
# longer run before shipping.
HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 \
    CMD nordvpn status | grep -q "Status: Connected" || exit 1

# DECISION 2026-06-26 (Q2): KEEP the shell-form '&&' chain as-is. s6 (/init) is PID 1 and
# forwards signals, so shell-form is fine. The chain is fail-closed: nord_connect retries
# ~2.3h and nord_watch self-heals transient drops in place, so it exits only on truly
# unrecoverable states (kill switch stays up). Recovery relies on a Docker restart policy —
# REQUIREMENT documented in README/user-guide: run with --restart=unless-stopped.
CMD nord_login && nord_config && nord_connect && nord_watch
```

**Companion file edits (not in the Dockerfile):**

- **`.dockerignore`** [Plan B] — append (verified currently only excludes `.git .github .img
  *.md LICENSE`):
  ```
  .ai
  docs
  scripts
  Taskfile.yml
  .gitattributes
  .ai-prime-version
  .ai-prime-versions.json
  ```
- **Shebang fixes** [Plan B] — ⚠️ **rootfs edits: preserve LF endings** (`.gitattributes`
  enforces, but verify on Windows):
  - `rootfs/usr/bin/nord_config`: `#!/usr/bin/with-contenv bash` → `#!/usr/bin/with-contenv /bin/bash`
  - `rootfs/usr/bin/nord_watch`: `#!/usr/bin/bash` → `#!/bin/bash`
  - (Both verified live. Per Plan B, do **not** add `with-contenv` to `nord_watch` — its env
    vars are Docker `ENV`, not s6 container env; "if it ain't broke, don't fix it.")

---

## STEP 3 — Phased Implementation Roadmap

Ordered **safest → riskiest**. Each phase is independently committable and revertible. The
branch is `chore/dockerfile-optimization` (per Plan B's execution order).

### Phase 0 — Pre-flight & baseline (no changes)
- `git checkout -b chore/dockerfile-optimization`
- Capture a known-good baseline: `task docker-build` + `task verify` (all 4 pass), and record
  image size: `docker image inspect fredplex/nordvpn:$(git log -1 --format=%h) --format '{{.Size}}'`.
- **Why**: establishes the before/after size delta and a clean rollback point.
- **Breaking risks**: none (read-only) — but **plan the merge now** (see STEP 1.5d): the PR that
  lands these Dockerfile edits will run `publish.yml`. Keep the two `ARG *_VERSION` lines
  byte-identical across every phase so the release guard bypasses; otherwise the merge pushes
  `:latest` to Docker Hub. Confirm the diff guard bypassed before merging (Actions log:
  "No version bump detected").

### Phase 1 — Zero-risk hygiene (no behavior change)
Changes: fix `maintainer` typo; `autoclean`→`clean`; normalize the `rm -rf` indentation
[Plan A]; remove `libc6`; harden `curl`; expand `.dockerignore`; fix both shebangs; (optional)
add `ARG NORDVPN_RELEASE`. **Docs (Q2)**: add a `--restart=unless-stopped` note to
README/user-guide — the restart policy is the `CMD` chain's recovery safety net. **Tooling (Q7)**:
add `export MSYS_NO_PATHCONV=1` + `export MSYS2_ARG_CONV_EXCL='*'` near the top of
`scripts/verify.sh` (no-ops on Linux/Mac) so `task verify` stops false-failing under Git Bash (F1).
- **Why these are safe**: `libc6` is already in the base (no-op removal); `.dockerignore`
  entries are never `COPY`'d; `clean` only empties a cache the `rm` already clears.
- **Breaking risks to watch**:
  - **`curl -f --proto '=https'`** now **fails the build loudly** if the NordVPN endpoint
    returns ≥400 or an http redirect. That is the intended hardening, but watch CI: a future
    NordVPN URL/redirect change surfaces here as a *clear* build failure instead of a silent
    junk `.deb`.
  - **Shebang edits are `rootfs/` files** → CRLF would cause `bad interpreter`. Verify LF
    before commit (`git diff --check`; confirm no CRLF introduced).
- **Validate**: `task docker-build` + `task verify` (all 4).

### Phase 2 — Permission-model restructure (`COPY --chmod`)
Changes: `COPY /rootfs /` + the 10-line `RUN chmod` block → `COPY --chmod=0755 rootfs /`. Add
the `# syntax=docker/dockerfile:1` header.
- **Why `COPY --chmod` over git-exec-bits**: determinism across the Windows-local / Linux-CI
  build matrix (see Conflict 2). The explicit mode stamp does not depend on NTFS or on
  `core.fileMode`.
- **Breaking risks to watch**:
  - **Requires BuildKit (verified asymmetric — see STEP 1.5a).** CI is safe (buildx confirmed in
    all three workflows). **Local `task docker-build`/`dev-build.sh` use plain `docker build`** and
    rely on Docker Desktop's BuildKit default — works today, but unenforced. Confirm locally with
    `docker buildx version`. Under a legacy builder, `--chmod` is an "unknown flag" parse error
    (loud, safe failure). **DECIDED (Q4): set `DOCKER_BUILDKIT=1` via Task's `env:` key** (a
    `Taskfile.yml` edit, sign-off given) so this never regresses — recommend a top-level `env:`
    so `docker-build`/`dev-build` and their scripts inherit it.
  - **Must confirm executability *inside* the image**, not just that it builds:
    `docker run --rm --entrypoint /bin/bash <img> -c 'ls -l /usr/bin/nord_* /etc/cont-init.d /etc/services.d/nordvpn/run'`
    Every script must be `-rwxr-xr-x`. If any is `644`, the container won't start (s6 can't
    exec it) — this is the single highest-impact regression in the whole plan, so test it
    explicitly.
  - `type` / `notification-fd` become `0755` (inert — documented).
- **Validate**: build + verify + the executability check above + confirm Check 4 (nordvpnd
  socket) still passes (proves s6 executed the run script).

### Phase 3 — Base image digest pin
Changes: `FROM ...:noble` → `...:noble@sha256:<digest>` (resolve current digest first).
- **Why**: reproducibility + supply-chain integrity; *enforces* the no-bump rule.
- **Breaking risks to watch**:
  - **Wrong/typo'd digest** → `manifest unknown` build failure (safe, loud). Resolve with
    `docker buildx imagetools inspect` immediately before pinning.
  - **Interaction with Phase 5 / Conflict 1**: digest-pin + keep `upgrade` = patched-at-build
    but base frozen; digest-pin + remove `upgrade` = **fully frozen** (needs a deliberate
    re-pin + rebuild cadence or CVEs accrue). Decide jointly with Phase 5.
  - CI must pull that digest (public ghcr — fine).
- **Validate**: build + verify.

### Phase 4 — Dependency slimming (TEST-GATED — behavior-affecting)
> **RESULT (2026-06-26): mostly NOT WORTH DOING.** Validation showed `--no-install-recommends`
> broke the kill switch (F4) for **<1%** size (F7). Revised scope: **do not** apply NIR; switch
> `wireguard`→`wireguard-tools` and **add explicit `iptables`** (correctness/clarity, not size).
> The only real wins are the safe items in Phase 1 + `COPY --chmod` (Phase 2). The original
> sub-steps below are retained as the record of what was tested.
Changes: apply `--no-install-recommends`; remove `net-tools` + `iputils-ping`; **test removing
`wireguard` entirely**, falling back to `wireguard-tools` only if NordLynx breaks.
- **Why**: smallest attack surface + meaningful size reduction.
- **Breaking risks to watch** (highest in the plan):
  - **`task verify` is BLIND to this phase's failure modes (verified — STEP 1.5b), not merely
    "insufficient."** It connects with a *fake token* and only WARNs (never FAILs) on a missing
    daemon socket, so a broken daemon or a non-connecting tunnel still yields a **green** verify.
    The **manual real-token connect + egress-IP test is the ONLY gate that can catch a Phase 4
    regression, and is mandatory**: start with a real `TOKEN`, confirm `nordvpn status` =
    *Connected*, and verify a real exit IP (the 5.1.0 Madrid-egress style check).
  - **`--no-install-recommends` on the `nordvpn` line** is the riskiest token. Fallback: drop
    the flag from that one line, keep it on the utility install.
  - **`wireguard` removal**: NordLynx may need `wg`. If the connect test fails, add
    `wireguard-tools` (never the full metapackage).
  - **`net-tools`/`iputils-ping` removal** (DECIDED Q5: keep removed): only affects interactive `docker exec` debugging.
    Verified no `rootfs/` script uses them. Low risk; document that `ip`/`curl` remain for
    in-container diagnostics.
- **Validate**: build + verify + **manual NordLynx connect + egress-IP check**.

### Phase 5 — Runtime signals & owner decisions
Changes: add `HEALTHCHECK` — **approved 2026-06-26 (Q3)**; validation step: confirm the Docker
healthy↔unhealthy transition in a run longer than the 45s start-period (grep string + ~5s connect
already validated, F10). (`apt-get upgrade` resolved 2026-06-26: **keep as-is**; base-refresh
cadence deferred to a future task — see Owner Decisions Log.)
- **Why**: orchestrator-visible health; a deliberate patch strategy.
- **Breaking risks to watch**:
  - **HEALTHCHECK string coupling**: must match the client's exact `nordvpn status` wording.
    If NordVPN changes the text, health flaps. `--start-period` must exceed real connect time
    or Unraid shows `unhealthy` at boot. This is a **behavior change** (Unraid now reports
    health) — desired, but new.
  - **Downstream coupling**: containers using `--net=container:vpn` are unaffected by the
    health *status*, but any tooling that gates on `healthy` will now see real transitions —
    note it in the changelog.
  - **Removing `apt-get upgrade`** is only safe paired with periodic base refresh (digest
    re-pin or `docker build --pull`); otherwise CVEs accrue silently.
- **Validate**: build + verify + observe `docker ps` health transitions (healthy after
  connect; unhealthy if the tunnel is forced down).

### Phase 6 — Documentation sync (final, doc-only — no behavior change)
Run **last**, after the build changes land and validate, so docs describe what actually
shipped. Lowest risk. Each item below is tied to a concrete change from Phases 1–5.

**`docs/`**
- **`architecture.md`** — add a "Health reporting" note (HEALTHCHECK surfaces tunnel state to
  Docker/Unraid); add Key Architectural Decisions entries for `COPY --chmod` (permission
  model, replaces the chmod block), base-image **digest pin** (reproducibility), **dropping the
  wireguard package** (NordVPN's `.deb` bundles NordLynx — F5/F6), and the
  `--restart=unless-stopped` requirement (Q2); add **BuildKit requirement** + **Git-Bash
  `verify.sh`** notes to "Known Constraints and Gotchas"; mention `ARG NORDVPN_RELEASE` in
  Versioning Design.
- **`build-and-publish.md`** — §2 Windows prerequisites: **`task verify` now runs under Git
  Bash** (verify.sh sets `MSYS_NO_PATHCONV`; WSL2 no longer required *for verify* — dev-build
  scripts still use bash tooling); note the Dockerfile **requires BuildKit** (CI buildx already
  satisfies it; local Taskfile now sets `DOCKER_BUILDKIT=1`); add a Troubleshooting row for
  "`COPY --chmod` unknown flag → enable BuildKit".
- **`quick-build-checklist.md`** — update the Windows prerequisite note (verify works in Git
  Bash now); add the BuildKit troubleshooting row.
- **`tech-stack.md`** — Container Layer: `iptables` now **explicitly installed**; keep
  `wireguard-tools` (drop full `wireguard` / `net-tools` / `iputils-ping` / `libc6`); add
  **BuildKit** to Build Tooling; note the base **digest pin** in Key Version Constraints; add an
  Upgrade History row (2026-06-26 Dockerfile optimization); list the removed packages under
  Deprecated/Removed.
- **`user-guide.md`** — add **`--restart=unless-stopped`** to the run guidance (Q2); note the
  container now **reports health** to Docker/Unraid (HEALTHCHECK); note `task verify` works
  under Git Bash (Q7).
- **`testing.md`** — note `verify.sh` is now MSYS/Git-Bash safe; mention HEALTHCHECK as a
  runtime health signal (distinct from the 4 `verify` checks).
- **`feature-state.md`** — add HEALTHCHECK as a feature; record the Dockerfile hardening.

**`.ai/`**
- **`current.md`** — update handoff: optimization shipped, build date, fragile areas.
- **`tasks/active.md`** — move the Dockerfile optimization to completed; add the **base-refresh
  cadence** future task (Q1).
- **`SESSION_NOTES.md`** — add a session-close entry.
- **`memory/architecture-decisions.md`** — mirror the new decisions (COPY --chmod, HEALTHCHECK,
  digest pin, wireguard drop, restart policy, BuildKit).
- **`rules/mutation-rules.md`** — add the approved `Taskfile.yml` `DOCKER_BUILDKIT` env (Q4) and
  `scripts/verify.sh` MSYS fix (Q7) to the Currently Approved list.

**Repo-root docs (relevant, though outside `.ai/`+`docs/`)**
- **`README.md`** — add the `--restart=unless-stopped` note (primary user-facing home of the Q2
  deliverable) + a Changelog entry.
- **`AGENTS.md`** — Project File Map: chmod block → `COPY --chmod`; add HEALTHCHECK; the
  `ARG NORDVPN_RELEASE` insertion shifts the Version-Bump line references.
- **`CLAUDE.md`** — Constraints: note the one approved `Taskfile.yml` exception (`DOCKER_BUILDKIT`).

**Validate**: every internal link resolves; no stale references to the removed chmod block,
`# syntax` directive, or the `wireguard` metapackage; doc claims match the shipped
`Dockerfile` / `Taskfile.yml` / `verify.sh`.

---

### Optional / Future (low priority, not scheduled)
- **Base-refresh cadence** (logged from Q1, 2026-06-26): periodically re-pin the base digest +
  rebuild (or `docker build --pull`) so OS security patches land without a manual base bump;
  then reconsider removing `apt-get upgrade`.
- **BuildKit apt cache mount** [Plan B Tier 3]: `RUN --mount=type=cache,target=/var/cache/apt`
  speeds rebuilds without bloating the image (cache lives outside the layer; the `rm` still
  keeps the image small). Build-speed only; defer.

---

## Scope

**In**: everything in Phases 0–6 above (Phase 6 = documentation sync across `docs/`, `.ai/`,
and the repo-root docs).
**Explicitly out** (consensus): multi-stage build; non-root `USER`; base image *bump* (digest
*pin* of the current noble is in-scope and distinct); NordVPN version bump; `Taskfile.yml`
edits **except the approved `DOCKER_BUILDKIT=1` env (Q4)**; `rootfs/` logic changes (only
shebang lines touched).

## Validation — gate before "done"
- `task docker-build` clean; `task verify` all 4 (`IMAGE_VERSION` env, `nordvpn --version`=5.1.0,
  iptables OUTPUT DROP, nordvpnd socket).
- Phase 2: scripts are `-rwxr-xr-x` inside the image; container starts.
- Phase 4: **manual** NordLynx connect + real egress IP (socket check alone is insufficient).
- Phase 5: `docker ps` shows healthy↔unhealthy transitions correctly.
- Phase 6: docs match the shipped `Dockerfile`/`Taskfile.yml`/`verify.sh`; all internal links
  resolve; no stale references to the chmod block, `# syntax` directive, or `wireguard` metapackage.

## Open Questions (for owner)
1. **`apt-get upgrade`** — **ANSWERED (2026-06-26): keep as-is for now** (patching channel).
   Future task logged: adopt a base-refresh cadence (couples with the Phase 3 digest pin). See
   Owner Decisions Log.
2. **`--no-install-recommends`** — **ANSWERED (F4/F7): no.** It broke the kill switch for <1%
   size; dropped from the plan. Re-open only with `iptables` pinned explicitly.
3. **`wireguard`** — **ANSWERED (F5/F6): removable entirely; plan keeps `wireguard-tools` as
   insurance.** Full metapackage dropped.
4. **`HEALTHCHECK`** — **ANSWERED (2026-06-26): approved.** Add as specified; grep string + ~5s
   connect already validated (F10). Remaining Phase 5 validation: observe the healthy↔unhealthy
   flip in a longer run. See Owner Decisions Log.
5. **`CMD` `&&` chain** — **ANSWERED (2026-06-26): leave as-is.** Fail-closed and self-healing
   for transient drops; recovery for unrecoverable states relies on a Docker restart policy.
   New scoped item: document `--restart=unless-stopped` (Phase 1). See Owner Decisions Log.
6. **Pristine modes** — **ANSWERED (2026-06-26): accept** the inert `0755`; single `COPY --chmod`,
   no split. See Owner Decisions Log.
7. **BuildKit for local builds** — **ANSWERED (2026-06-26): adopt explicit.** Set
   `DOCKER_BUILDKIT=1` via Task's `env:` key (top-level recommended); `Taskfile.yml` edit
   approved. Guarantees `COPY --chmod` never regresses; portable across Win/Mac/Linux. See
   Owner Decisions Log.

## Source cross-reference (what came from where)
| Master item | Independent Review | Plan A | Plan B |
|---|---|---|---|
| Base digest pin | ✅ origin | — | — |
| `curl` hardening | ✅ origin | — | — |
| Maintainer typo | ✅ origin | — | — |
| Remove `libc6` | ✅ | — | ✅ origin |
| `clean` vs `autoclean` | ✅ origin | — | — |
| `COPY --chmod` mechanism | (corrected) | ✅ origin | (alt: git bits) |
| Fix `COPY` path | ✅ | (kept slash) | ✅ origin |
| Expand `.dockerignore` | — | — | ✅ origin |
| Shebang fixes | — | — | ✅ origin |
| `wireguard-tools` refinement | — | ✅ origin | (test-removal) |
| `--no-install-recommends` | ✅ | ✅ origin | (rejected) |
| Remove net-tools/iputils-ping | ✅ | — | ✅ origin |
| `apt-get upgrade` = decision | ✅ | (remove ❌) | ✅ origin |
| `HEALTHCHECK` | ✅ | — | ✅ origin |
| `ARG NORDVPN_RELEASE` | — | ✅ origin | — |
| Reject multi-stage / non-root | ✅ | ✅ | ✅ |
