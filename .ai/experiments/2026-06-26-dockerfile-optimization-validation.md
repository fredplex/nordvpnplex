# Experiment — Dockerfile Optimization Validation (Build + Real Connect)

Date: 2026-06-26 | Branch: `docs/dockerfile-security-review` | Status: Complete
Related plan: `.ai/plans/dockerfile-optimization-master-plan.md`

> **Purpose**: empirically validate the master plan's Phase 2 (`COPY --chmod`) and Phase 4
> (dependency slimming) changes by building real images and running a **real-token NordVPN
> connect + egress test** — the gate `task verify` structurally cannot perform. Scope B
> (baseline + candidate), Spain exit. No commits, no push, no publish.

---

## Method

- **Host**: Windows 11, Docker 29.5.3, buildx v0.34.1 (BuildKit default), task 3.50.0.
- **Token**: read from a scratchpad file; never printed or passed as a process arg.
- **Connect harness**: `artifacts/connect-test.sh` — starts the container with a real `TOKEN` +
  `CONNECT=Spain` and `--cap-add=NET_ADMIN,NET_RAW`, polls `nordvpn status` for
  `Status: Connected`, then reads the exit IP via `ipinfo.io` *through the tunnel*. Proves real
  egress, not just daemon liveness.
- **Smoke**: `scripts/verify.sh` (the project's 4 checks).
- **Candidate Dockerfile**: `artifacts/Dockerfile.candidate-validated` (iterated v1→v3 below).

---

## Results

### Baseline — current `Dockerfile` (unmodified)
- Build: OK → `fredplex/nordvpn:ca27eec`. BuildKit confirmed; BuildKit warned
  `JSONArgsRecommended … line 52` (the shell-form `CMD` — matches the analysis).
- `verify.sh`: **3 passed / 0 failed / 1 warn** (after disabling MSYS path conversion — see
  Finding F1).
- **Real connect**: ✅ Connected, **Spain #151 (Madrid), NORDLYNX/UDP**, exit IP
  `192.145.38.122` → ipinfo `Madrid, ES` (AS136787 PacketHub). Real egress confirmed.
- **Size: 110.2 MB.**
- `nordvpn status` prints exactly `Status: Connected` → validates the HEALTHCHECK grep string.

### Candidate v1 — proposed master changes (NIR, wireguard-tools, COPY --chmod, removals)
- First build **FAILED**: the `# syntax=docker/dockerfile:1` directive forced a pull of the
  `docker/dockerfile:1` frontend, which returned **401 Unauthorized** (stale registry creds in
  this env). Removed the directive → built fine. `COPY --chmod` needs no syntax directive on
  modern BuildKit. **(Finding F2.)**
- `COPY --chmod=0755` result: **all scripts `-rwxr-xr-x`** incl. the inert `type` /
  `notification-fd` data files. Mechanism validated. **(Finding F3.)**
- `verify.sh`: **3 passed / 1 FAILED** — `iptables: command not found`, kill-switch Check 3
  FAILED. `--no-install-recommends` silently dropped `iptables`. **DISQUALIFIED. (Finding F4.)**

### Candidate v2 — v1 + explicit `iptables` (keep NIR, keep wireguard-tools)
- `verify.sh`: **3 passed / 0 failed / 1 warn** — kill switch restored.
- **Real connect**: ✅ Connected, Spain #151 (Madrid), NORDLYNX, exit `192.145.38.125`
  (Madrid, ES). **wireguard-tools is sufficient for NordLynx — the full `wireguard`
  metapackage is unnecessary. (Finding F5.)**
- **Size: 109.5 MB (−0.7 MB vs baseline).**

### Candidate v3 — v2 minus `wireguard-tools` entirely (`curl iptables` only)
- **Real connect**: ✅ Connected, Spain #174 (Madrid), NORDLYNX, exit `192.145.39.51`
  (Madrid, ES). **NordVPN's own `.deb` bundles its NordLynx userspace — no `wireguard` OR
  `wireguard-tools` package is required at all. (Finding F6.)**
- **Size: 109.4 MB (−0.8 MB vs baseline).**

---

## Findings

| ID | Finding | Impact on plan |
|----|---------|----------------|
| **F1** | `task verify`/`verify.sh` give **false FAILs under Git Bash on Windows** — MSYS converts the `--entrypoint /bin/bash` arg to `C:/Program Files/Git/usr/bin/bash`. Checks 2 & 3 fail spuriously. Fix: `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'`, or run under WSL2. | Build-process gap on the owner's OS. Add to docs/validation. |
| **F2** | `# syntax=docker/dockerfile:1` triggers a frontend **registry pull that 401'd**; it is **not needed** for `COPY --chmod` on modern BuildKit. | **Remove the syntax directive** from the master Dockerfile. |
| **F3** | `COPY --chmod=0755 rootfs /` produces correct exec bits on Windows-built images (incl. inert 0755 on `type`/`notification-fd`); container runs and connects. | **Phase 2 validated** — adopt as-is. |
| **F4** | `--no-install-recommends` **silently removed `iptables`**, breaking the kill switch (Check 3 FAIL). `iptables` was an implicit Recommends. | **Phase 4 high-risk.** If NIR is used, **`iptables` must be installed explicitly.** Plan B's caution was correct; Plan A's "zero behavior change" is disproven. |
| **F5** | With explicit `iptables`, NIR + **`wireguard-tools` connects** via NORDLYNX. | Full `wireguard` metapackage is unnecessary. |
| **F6** | **No wireguard package needed at all** — Nord's `.deb` bundles NordLynx. candidate3 connects. | Answers the plan's open question. But see F7. |
| **F7** | **Dependency slimming saves only ~0.8 MB total (<1%)** while carrying the F4 kill-switch risk and an implicit-bundle dependency (F6). | **Reframe Phase 4: low value, real risk.** Recommend against `--no-install-recommends`; if kept, pin `iptables` explicitly. Keep `wireguard-tools` as cheap insurance rather than relying on Nord's bundle. |
| **F8** | `verify.sh` **does** catch a missing kill switch (Check 3 caught F4), but Check 4 uses a **fake token** and only WARNs — it cannot catch a tunnel-connectivity break. The real-token connect test is the only gate for that. | Confirms STEP 1.5b (partially): blind to *connectivity*, not to *kill switch*. |
| **F9** | Hardened `curl -fsSL --proto '=https' --tlsv1.2`, `ARG NORDVPN_RELEASE`, `COPY rootfs /` path fix, `apt-get clean`, and `libc6`/`net-tools`/`iputils-ping` removal all built and ran cleanly. | Phase 1 + the safe Phase 2 items validated. |
| **F10** | HEALTHCHECK grep string `Status: Connected` matches real output; the Docker health *transition* was not directly observed (test containers were short-lived). | Phase 5: string validated; confirm the healthy/unhealthy transition during a longer run before shipping. |

---

## Recommendation (revised by evidence)

**Do (validated, worthwhile):**
- `COPY --chmod=0755 rootfs /` replacing the chmod block (F3). **No `# syntax` directive** (F2).
- Phase 1 hygiene: hardened curl, `clean`, `COPY` path, label fix, `ARG NORDVPN_RELEASE`,
  remove `libc6`/`net-tools`/`iputils-ping` (F9).

**Reconsider (low value, real risk — F4/F7):**
- `--no-install-recommends`: **only with `iptables` (and any other critical implicit dep) listed
  explicitly.** Given <1% size benefit, the safer default is to **not** add NIR.
- `wireguard`: removable entirely (F6), but for ~0.1 MB the safer choice is to keep
  **`wireguard-tools` explicitly** rather than depend on Nord's bundle staying present.

**Net**: the high-confidence wins are Phase 1 + `COPY --chmod`. The dependency slimming is mostly
not worth its risk.

---

## Reproducibility & cleanup
- Artifacts: `artifacts/connect-test.sh`, `artifacts/Dockerfile.candidate-validated` (the v2
  config: NIR + explicit `iptables` + `wireguard-tools`).
- Run: `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' TOKEN_FILE=<path> bash artifacts/connect-test.sh <image> <name> Spain`
- Cleanup performed: test containers removed; throwaway images `:candidate`, `:candidate2`,
  `:candidate3` removed; `Dockerfile.candidate` deleted from repo root. Baseline `:ca27eec` kept.
- The token file remains in the session scratchpad (outside the repo); delete it when done.
