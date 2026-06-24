# Fix — CI "nordvpn version" smoke test runs through s6 init and fails

Created: 2026-06-24 | Status: In progress — both phases implemented, awaiting commit approval

## Background

The daily `check-nordvpn-release` workflow detected NordVPN `5.1.0` and triggered
the reusable `publish-dev` workflow. The image built and pushed, but the
**"Smoke test — nordvpn version"** step failed with `expected '5.1.0', got ''`.

Root cause (full analysis in `.ai/debug/publish-dev-smoke-test-failure.md`): the
step runs `docker run --rm <image> nordvpn --version` through the image's default
s6-overlay `/init` entrypoint with **no `NET_ADMIN`**. The `00-firewall`
`cont-init.d` script's `iptables -P …` commands fail without that capability, s6
treats the failed init script as fatal and **halts before running the CMD**, so
`nordvpn --version` never executes and stdout is empty.

The local `scripts/verify.sh` (line 49) already avoids this by overriding the
entrypoint (`--entrypoint /bin/bash … -c "nordvpn --version"`). That pattern was
never mirrored into the two CI workflows.

## Scope

What's in:
- Fix the "nordvpn version" smoke test in **`publish-dev.yml`** (the failing step).
- Apply the **same fix to `publish.yml`** — its production release CD has the
  identical untrapped pattern (lines 114–125) and would fail the same way when the
  5.1.0 PR is merged.

What's explicitly out:
- **No change to `rootfs/etc/cont-init.d/00-firewall`.** The kill switch must stay
  fail-closed at real runtime; softening it to satisfy a test would weaken the core
  security invariant. The fix belongs in the test invocation only.
- No change to the iptables kill-switch smoke step (already passes — it grants caps).
- No change to build/push logic, tags, or version resolution.
- No base-image or Dockerfile changes.

## Changes

### Phase 1 — Fix `publish-dev.yml`
| File | Line(s) | Change |
|------|---------|--------|
| `.github/workflows/publish-dev.yml` | 95 | Add `--entrypoint /bin/bash` and wrap the command: `docker run --rm --entrypoint /bin/bash fredplex/nordvpn:dev -c "nordvpn --version" 2>/dev/null \| grep -oE '[0-9]+\.[0-9]+\.[0-9]+' \| head -1` |

### Phase 2 — Fix `publish.yml` (same latent bug)
| File | Line(s) | Change |
|------|---------|--------|
| `.github/workflows/publish.yml` | 117 | Same `--entrypoint /bin/bash … -c "nordvpn --version"` override against `fredplex/nordvpn:temp-release` |

### Resulting step (both files)
```bash
ACTUAL=$(docker run --rm --entrypoint /bin/bash <image> \
  -c "nordvpn --version" 2>/dev/null \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
```

## Execution Order

| # | Phase | Action | Commit prefix | Status |
|---|-------|--------|---------------|--------|
| 1 | 1 | Fix `publish-dev.yml` version smoke test | `fix(ci):` | ✅ Done |
| 2 | 2 | Fix `publish.yml` version smoke test | `fix(ci):` | ✅ Done |
| 3 | — | Validate (see below) | — | ⏳ Local syntax checks pass; CI re-run pending |

Both edits are small and tightly related; they can ship in one commit or two —
owner's preference.

## Validation

GitHub Actions changes can't be fully exercised locally, so:

- **Local proxy check** — confirm the override produces the version against a built
  image (this is exactly what `verify.sh` already does and what CI should mirror):
  ```bash
  docker run --rm --entrypoint /bin/bash fredplex/nordvpn:<tag> \
    -c "nordvpn --version" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1
  ```
  Expect the NordVPN version (non-empty).
- **Negative confirmation** — the same command *without* `--entrypoint` (and without
  `--cap-add=NET_ADMIN`) reproduces the empty output, confirming the diagnosis.
- **End-to-end** — re-run the `publish-dev` workflow (manual `workflow_dispatch`
  with `nordvpn_version: latest`) and confirm all three smoke tests pass.
- Then the 5.1.0 PR can be merged so `publish.yml` runs the corrected production CD.

## Open Questions

- **Should both smoke checks share one mechanism?** The kill-switch step uses
  `--cap-add` + default entrypoint; the version step will use `--entrypoint`
  bypass. They're testing different things (CMD output vs. firewall behavior), so
  keeping them distinct is fine — flagging only for consistency review.
- **Commit granularity** — one combined `fix(ci):` commit vs. two. Recommend one,
  since they are the same fix in two files.
