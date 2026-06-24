# Debug — `publish-dev` smoke test "nordvpn version" fails with empty output

Created: 2026-06-24 | Status: Diagnosed — fix planned (`.ai/plans/fix-publish-dev-smoke-test.md`)

## Symptom

Today's daily `check-nordvpn-release` workflow detected a new NordVPN version (`5.1.0`)
and triggered the reusable `publish-dev` workflow. The image **built and pushed
successfully**, but the **"Smoke test — nordvpn version"** step failed:

```
Run ACTUAL=$(docker run --rm ***/nordvpn:dev nordvpn --version 2>/dev/null \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
EXPECTED="5.1.0"
...
FAIL: expected '5.1.0', got ''
Error: Process completed with exit code 1.
```

`ACTUAL` is **empty** — the version regex matched nothing because the command
produced no stdout. This is not a wrong-version problem; the version check never
actually ran.

## Root cause

The failing step is `.github/workflows/publish-dev.yml` lines 93–103:

```bash
ACTUAL=$(docker run --rm fredplex/nordvpn:dev nordvpn --version 2>/dev/null \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
```

This invokes the binary **through the image's default entrypoint**, which is
s6-overlay's `/init` (inherited from `ghcr.io/linuxserver/baseimage-ubuntu:noble`).
The run grants **no Linux capabilities** (`--cap-add` is absent).

The first init script to run is `rootfs/etc/cont-init.d/00-firewall`:

```bash
update-alternatives --set iptables /usr/sbin/iptables-legacy
update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
iptables -P OUTPUT DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP
```

`iptables -P …` (and the `update-alternatives`/iptables setup) **require
`NET_ADMIN`**. Without it the commands exit non-zero. s6-overlay v3 treats a
non-zero exit from any `cont-init.d` script as a **fatal init failure** and
**halts before exec'ing the CMD** (`nordvpn --version`). Result: no stdout →
`grep` matches nothing → `ACTUAL=""` → `FAIL`.

So the version binary never executed. The container died during init.

## Why the other two smoke checks pass

| Check | Why it passes |
|-------|---------------|
| IMAGE_VERSION label (`publish-dev.yml:80`) | Uses `docker inspect` — never starts the container, so s6 init is irrelevant. |
| iptables kill switch (`publish-dev.yml:105`) | Adds `--cap-add=NET_ADMIN --cap-add=NET_RAW`, so the firewall init succeeds and the CMD runs. |

Only the **nordvpn version** check both starts the container **and** omits the
capabilities/entrypoint override — so it is the only one that trips the s6-init
failure.

## Why this surfaced now (not earlier)

The local smoke-test script `scripts/verify.sh` already solved this exact problem.
Its version check (line 49) bypasses s6 init:

```bash
ACTUAL_NORDVPN="$(docker run --rm --entrypoint /bin/bash "${IMAGE_REF}" \
  -c "nordvpn --version" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
```

(See `SESSION_NOTES.md` 2026-06-23 — *"verify.sh — added `--entrypoint /bin/bash`
override to bypass s6 init for stateless version check."*)

That fix was **never mirrored into the CI workflow**. The `publish-dev` workflow
had not previously been exercised end-to-end by a real auto-triggered run — today's
NordVPN `5.1.0` detection was the **first full automated run**, which surfaced the
latent gap.

## Fix (summary)

Align the CI step with `verify.sh`: bypass s6 init by overriding the entrypoint.
Full plan in `.ai/plans/fix-publish-dev-smoke-test.md`.

```bash
ACTUAL=$(docker run --rm --entrypoint /bin/bash fredplex/nordvpn:dev \
  -c "nordvpn --version" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
```

## Notes / follow-ups

- The `00-firewall` script runs `iptables -P …` with no `2>/dev/null` and no
  `|| true`. The kill-switch must stay fail-closed at real runtime, so we should
  **not** soften that script just to make a test pass — the correct fix is in the
  test invocation, not the init script.
- Consider whether `publish.yml` (production release CD) has the same untrapped
  pattern in any of its smoke/verify steps — audit as part of the fix.
