# Dockerfile Security & Optimization Review (Isolated)

Created: 2026-06-26 | Status: Pending review

> **Provenance**: This is an **independent, isolated review** of [`Dockerfile`](../../Dockerfile),
> performed at the owner's explicit request *without* consulting the existing
> `.ai/plans/dockerfile-optimization.md` or any other in-repo optimization notes.
> It is intentionally a separate artifact so its conclusions can be compared against
> the prior plan rather than inheriting from it.

---

## Method note

A rigorous review has to account for *what this image actually is*. This is not a
stateless app container — it is a **network gateway** built on linuxserver.io's
**s6-overlay** base image. That single fact invalidates two of the most common
"best practice" recommendations (run-as-non-root and multi-stage builds), and they
are explained below rather than parroted.

---

## Deep-Thinking Analysis

### 1. Security Hardening

**Non-root user — DOES NOT APPLY here, and recommending it would be wrong.**
The reflexive advice is "add `USER nonroot`." But this container's core job is to set
an iptables kill switch (OUTPUT policy DROP), create `/dev/net/tun`, and manipulate
routing tables before the VPN connects. Those operations require
`CAP_NET_ADMIN`/`CAP_NET_RAW` and effectively root in the init phase. Worse, the base
image already implements the correct pattern: s6-overlay runs init/services as root
and drops privilege to `PUID/PGID` for application processes via `s6-setuidgid`.
Bolting a `USER` directive on top would break the init chain. The right hardening
posture is therefore *capability minimization at runtime*
(`--cap-add=NET_ADMIN --cap-add=NET_RAW` instead of `--privileged`), which is a
run-command concern, not a Dockerfile one. Flagged so it isn't "fixed" incorrectly.

**Unverified remote fetch — the real supply-chain weakness (line 23).**
```
curl https://repo.nordvpn.com/.../nordvpn-release_1.0.0_all.deb --output /tmp/nordrepo.deb
```
This `curl` has no `-f` (fail on HTTP >=400), no `-S`, no `-L`, and no protocol pin.
The consequence is concrete: if the endpoint returns a 404/HTML error page or a
captive-portal redirect, curl exits **0** and writes the junk body to `nordrepo.deb`.
`apt-get install` then fails several lines later with a confusing error, and worse, a
silent partial/poisoned payload is possible. Use `curl -fsSL --proto '=https' --tlsv1.2`.
(The *NordVPN package itself* is fine — once `nordvpn-release` installs the signed apt
repo, apt verifies the `nordvpn` package signature. It is only this bootstrap `.deb`
that rides on bare TLS.)

**Base image is a moving target (line 1).**
`ghcr.io/linuxserver/baseimage-ubuntu:noble` is a rolling tag. Two builds a week apart
can produce different bases — a reproducibility and integrity gap. Best practice is to
pin a digest: `...:noble@sha256:<digest>`. This is *compatible* with the project rule of
"don't bump the base image" — pinning a digest of the *current* noble actually enforces
that rule more strictly.

**Attack-surface bloat (line 22).** `libc6` is already present in any Ubuntu base —
redundant. `net-tools` (`ifconfig`/`route`) and `iputils-ping` are classic debugging
tools that enlarge the surface; they should be removed *unless* a `rootfs/` script
actually shells out to `ifconfig`/`ping`. Treated conservatively in the optimized file
(removed `libc6`; commented out the other two with a re-verify note) rather than deleted
blind.

**Secrets:** Clean. The `TOKEN`/`TOKENFILE` model keeps credentials at runtime —
nothing sensitive is baked into a layer. No change needed.

### 2. Build Performance & Layer Efficiency

**The install layer is mostly well-built.** The `RUN` correctly chains everything into
one layer and cleans `/var/lib/apt/lists`, `/var/cache/apt/archives`, and `/tmp` in the
*same* layer (cleanup in a later layer would be useless — the bytes persist in the lower
layer). Good.

**`apt-get upgrade -y` (line 21) is a genuine tradeoff, not a clear bug.** It pulls in
floating security patches, which *helps* CVE posture but *hurts* reproducibility and
cache stability (the layer's output changes whenever upstream does). Given the base image
is intentionally not bumped, `upgrade` may be the only patching channel — so it is *not*
removed here, but the choice should be deliberate. If reproducibility wins, drop it and
rely on digest-pinned bases + periodic rebuilds.

**`autoclean` vs `clean`:** `autoclean` only prunes packages no longer downloadable; the
subsequent `rm -rf /var/cache/apt/archives/*` makes it moot. Minor — `clean` is
marginally more honest, but the `rm` already covers it.

**The `chmod` layer (lines 39–48) is verbose and cache-fragile.** It is a 10-line block
doing what a glob can do in three lines, and it re-runs on any `rootfs/` change. Two
better options: (a) collapse to globs (`/usr/bin/nord_*`, `/usr/bin/dockerNetworks*`), or
(b) eliminate it entirely by committing the executable bit in git and using BuildKit
`COPY --chmod`. Option (a) is applied in the optimized file (zero-risk tidy); option (b)
is the longer-term win but touches git index state, so it is left as a comment.

**Multi-stage — DOES NOT APPLY, and here's the "why."** Multi-stage pays off when
build-time tooling (compilers, SDKs) can be discarded before the runtime stage. This
image installs *only runtime artifacts* — `nordvpn`, `nordvpnd`, `wireguard`. The one
arguably build-only tool, `curl`, is **also a runtime dependency** (the watchdog polls
connectivity with it). So a second stage would copy nearly everything forward and add
complexity for ~zero size benefit. Recommending it would be cargo-culting.

### 3. Production Best Practices

**No `HEALTHCHECK` — the biggest functional gap.** This is a VPN gateway whose entire
value is "is the tunnel up?" Internally `nord_watch` polls and triggers an s6 restart,
but that health signal never reaches Docker, so `docker ps` / Unraid always shows the
container as healthy even when egress is dead. A `HEALTHCHECK` querying `nordvpn status`
(with a `--start-period` to absorb connect time) surfaces real health to the orchestrator.

**Version tagging:** Good — `NORDVPN_VERSION` is pinned via ARG and `IMAGE_VERSION` flows
into both `ENV` and OCI labels. This is the correct pattern; nothing pinned to `latest`
for the app.

**`ENTRYPOINT`/`CMD` & signals:** The base image's `/init` (s6) is PID 1 and handles
signal forwarding correctly, so the headline "shell-form CMD breaks signals" critique
does not bite here — s6, not the shell, owns PID 1. Two real notes remain: (a) shell-form
`CMD nord_login && ... && nord_watch` still spawns a `/bin/sh -c` wrapper, and (b) the
`&&` chain means a transient `nord_connect` failure aborts the whole chain so `nord_watch`
never starts — resilience depends entirely on whether s6 restarts the CMD. Left intact
(changing it is a behavior change needing owner sign-off) but commented.

**Minor:** `LABEL maintainer="fredplexx@gmail.com"` has a double-`x` that looks like a
typo against the `fredplex` vendor/source labels; and `COPY /rootfs /` (leading slash) is
non-idiomatic — `COPY rootfs /` is the conventional form.

---

## Optimized Dockerfile

```dockerfile
# CHANGE: Pin the base image by digest for reproducibility + supply-chain integrity.
#   Resolve once with:  docker buildx imagetools inspect ghcr.io/linuxserver/baseimage-ubuntu:noble
#   then append @sha256:<digest>. Tag kept here since the digest must be resolved locally.
#   (This ENFORCES the "don't bump the base" rule rather than weakening it.)
FROM ghcr.io/linuxserver/baseimage-ubuntu:noble
# CHANGE: corrected maintainer typo (fredplexx -> fredplex) to match vendor/source labels.
LABEL maintainer="fredplex@gmail.com"

ARG NORDVPN_VERSION='5.1.0'
ARG IMAGE_VERSION='5.5.1'

# OCI standard image labels — externally queryable without running the container:
#   docker inspect <image> --format '{{json .Config.Labels}}'
LABEL org.opencontainers.image.title="nordvpn-unraid" \
      org.opencontainers.image.description="NordVPN Linux client Docker image for Unraid" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.vendor="fredplex" \
      org.opencontainers.image.source="https://github.com/fredplex/nordvpnplex"

# Expose version at runtime so cont-init.d/00-version and verify.sh can read it
ENV IMAGE_VERSION=${IMAGE_VERSION}

# ARG (not ENV) so the noninteractive setting does not persist into the final image.
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && \
    # NOTE: 'apt-get upgrade' is a deliberate tradeoff — it patches CVEs but reduces
    # build reproducibility. Kept because the base image is intentionally not bumped,
    # making this the primary patching channel. Remove if reproducibility is preferred.
    apt-get upgrade -y && \
    # CHANGE: removed redundant 'libc6' (always present in the Ubuntu base).
    # CHANGE: removed 'net-tools' + 'iputils-ping' (debugging tools = attack surface).
    #   --> Re-add ONLY if a rootfs/ script invokes ifconfig/route/ping.
    apt-get install -y --no-install-recommends curl wireguard && \
    # CHANGE: hardened fetch — -f fails on HTTP >=400 (no silent 404->junk .deb),
    #         -S shows errors, -L follows redirects, --proto/--tlsv1.2 lock transport.
    curl -fsSL --proto '=https' --tlsv1.2 \
        https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn-release/nordvpn-release_1.0.0_all.deb \
        --output /tmp/nordrepo.deb && \
    apt-get install -y /tmp/nordrepo.deb && \
    apt-get update -y && \
    # nordvpn package itself IS signature-verified by apt via the repo installed above.
    apt-get install -y nordvpn${NORDVPN_VERSION:+=$NORDVPN_VERSION} && \
    apt-get remove -y nordvpn-release && \
    apt-get autoremove -y && \
    # CHANGE: 'clean' (was 'autoclean') fully empties the package cache.
    apt-get clean -y && \
    # Cleanup in the SAME layer so the bytes never persist in a lower layer.
    rm -rf \
        /tmp/* \
        /var/cache/apt/archives/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

# CHANGE: 'rootfs' instead of '/rootfs' (idiomatic context-relative path).
COPY rootfs /

# CHANGE: collapsed the 10-line chmod block into globbed targets (clearer, fewer
# layers' worth of churn). LONGER-TERM: commit the +x bit in git and use
# 'COPY --chmod' to drop this RUN entirely.
RUN chmod 0755 /usr/bin/nord_* /usr/bin/dockerNetworks* \
               /etc/services.d/nordvpn/run \
               /etc/services.d/nordvpn/finish \
               /etc/services.d/nordvpn/data/check \
               /etc/cont-init.d/*

ENV S6_CMD_WAIT_FOR_SERVICES=1

# CHANGE: added a HEALTHCHECK so Docker/Unraid see REAL tunnel state (nord_watch's
# s6 restarts were previously invisible to the orchestrator). start-period absorbs
# initial connect time so the container isn't marked unhealthy during boot.
HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 \
    CMD nordvpn status | grep -q "Status: Connected" || exit 1

# NOTE: s6 (/init) is PID 1 and handles signal forwarding, so shell-form CMD is
# acceptable here. Caveat: the '&&' chain aborts if nord_connect fails transiently,
# so nord_watch never starts — resilience depends on s6 restarting this CMD.
# Left intact (changing it is a behavior change requiring owner sign-off).
CMD nord_login && nord_config && nord_connect && nord_watch
```

---

## Before you build this

Three of these changes are **behavior-affecting** and warrant a smoke test
(`task docker-build` + `task verify`), not just a visual diff:

1. **`net-tools`/`iputils-ping` removal** — verify no `rootfs/` script calls `ifconfig`,
   `route`, or `ping`. If any does, re-add it.
2. **`--no-install-recommends`** — tightens the install; confirm `wireguard`/`nordvpn`
   still pull every runtime dep they need (they normally declare hard deps, but verify
   NordLynx actually connects, not just that the socket appears).
3. **`HEALTHCHECK`** — confirm the exact `nordvpn status` "Connected" string on the pinned
   5.1.0 client, and that the 45s start-period covers the typical connect time.

The digest pin, `curl` hardening, `libc6` removal, `clean`, `COPY rootfs`, chmod-glob, and
maintainer typo are low-risk. `apt-get upgrade` and the `CMD` chain are left unchanged
since both are judgment calls that are the owner's to make.

---

## Risk summary (quick reference)

| # | Change | Vector | Risk | Behavior change? |
|---|--------|--------|------|------------------|
| 1 | Pin base image by digest | Security / reproducibility | Low | No |
| 2 | Harden `curl` (`-fsSL --proto '=https' --tlsv1.2`) | Security / supply chain | Low | No (fails louder) |
| 3 | Remove `libc6` | Efficiency | Low | No |
| 4 | Remove `net-tools` + `iputils-ping` | Security / size | Medium | Possibly (verify usage) |
| 5 | `--no-install-recommends` | Efficiency / size | Medium | Possibly (verify deps) |
| 6 | `autoclean` -> `clean` | Efficiency | Low | No |
| 7 | Collapse `chmod` block to globs | Efficiency / clarity | Low | No |
| 8 | `COPY /rootfs /` -> `COPY rootfs /` | Correctness / idiom | Low | No |
| 9 | Fix `maintainer` typo | Correctness | Low | No |
| 10 | Add `HEALTHCHECK` | Production best practice | Low–Med | Yes (new health signal) |
| — | Keep `apt-get upgrade` | (owner decision) | — | — |
| — | Keep `CMD` `&&` chain | (owner decision) | — | — |

---

## Open Questions

- Should `apt-get upgrade -y` stay (CVE patching) or go (reproducibility)? Tied to whether
  the base image will ever be digest-pinned + rebuilt on a cadence.
- Is the `&&` CMD chain intended to abort-and-rely-on-s6-restart, or should it be hardened
  so `nord_watch` always runs?
- Are `net-tools`/`iputils-ping` referenced anywhere in `rootfs/`? (Decides change #4.)
