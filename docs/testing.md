<!-- prime: version=3.0.5 template=docs/testing.md date=2026-07-02 -->
# Testing

Testing strategy, framework configuration, and coverage expectations for **nordvpnplex**.

**Working copy**: `.ai/workflows/definition-of-done.md`

---

## Testing Philosophy

This project has no traditional unit tests — it consists of shell scripts and a Dockerfile. Testing is done by building the image and running smoke checks against it. The goal is to catch the critical paths: wrong NordVPN version installed, kill switch broken, daemon not starting.

Two-tier testing model:
- **Tier 1** (`task verify`) — credentialless, CI-safe, ~30s. Validates image structure. Required after every build.
- **Tier 2** (`task verify-live`) — real NordVPN token, real NordLynx egress, Spain. Validates tunnel connectivity. Required before every `task release`.

`task verify` is structurally blind to tunnel connectivity — it uses a fake token and checks that the daemon socket exists, not that the VPN connects. `task verify-live` is the only gate that catches protocol-level regressions.

Static validation (`task docker-build`) verifies code correctness; runtime tests (`task verify` / `task verify-live`) verify feature correctness.

---

## Test Types

### Smoke Tests (`task verify`) — Tier 1

**Script**: `scripts/verify.sh`
**Run**: `task verify`
**When to run**: After every `task docker-build`. Required before `task release`.

`scripts/verify.sh` is **MSYS/Git Bash safe** on Windows: it sets `MSYS_NO_PATHCONV=1` and `MSYS2_ARG_CONV_EXCL='*'` at the top to prevent Git Bash from mangling `--entrypoint /bin/bash` into a Windows path. WSL2 is no longer required for `task verify`.

The script runs 4 checks against the locally built image (`fredplex/nordvpn:<git-hash>`):

| Check | Type | Method |
|-------|------|--------|
| 1. IMAGE_VERSION ENV = git hash | Stateless | `docker inspect` — no container startup |
| 2. `nordvpn --version` = NORDVPN_VERSION | Stateless | One-shot `docker run --rm` |
| 3. iptables OUTPUT policy = DROP | Stateless | One-shot `docker run --rm --cap-add=NET_ADMIN` |
| 4. nordvpnd socket at `/run/nordvpn/nordvpnd.sock` | Runtime | Start container for 12s, check socket |

Expected output on a passing run:
```
=== Verifying fredplex/nordvpn:<hash> ===
    NordVPN target: 5.1.0

--- Stateless checks ---
  PASS  IMAGE_VERSION env = <hash>
  PASS  nordvpn --version = 5.1.0
  PASS  iptables OUTPUT policy DROP (kill-switch functional)

--- Runtime check (daemon socket) ---
  PASS  nordvpnd socket present at /run/nordvpn/nordvpnd.sock

=== 4 passed | 0 failed | 0 warnings ===
```

### Real-Token Live Test (`task verify-live`) — Tier 2

**Script**: `scripts/connect-test.sh`
**Run**: `task verify-live TOKEN_FILE=/path/to/token`
**When to run**: **Required before `task release`** — run after `task verify` passes.

This is the mandatory pre-release gate. It:
1. Reads the NordVPN token from a file (token never appears in args, env dumps, or logs)
2. Starts the image with `--cap-add=NET_ADMIN --cap-add=NET_RAW`
3. Polls `nordvpn status` every 5s for up to 120s
4. On connect: checks egress IP via `ipinfo.io` to confirm Spain exit
5. Reports tunnel status, server, IP, technology, and image size

Expected passing output (example):
```
CONNECTED: yes  (waited ~5s)
--- nordvpn status ---
Status: Connected
Country: Spain
Current technology: NORDLYNX
--- egress (ipinfo.io, via tunnel) ---
  "country": "ES",
```

**Token security rule**: Token must be read from a file outside the repo. Never pass it as a CLI argument, env var that gets logged, or commit it.

### Build Validation (CI)

**Workflow**: `.github/workflows/build-validate.yml`
**Trigger**: PR → main
**What it checks**:
1. **Version-bump guard** (runs first, fails fast): if the PR changes `Dockerfile` or
   `rootfs/**`, its Dockerfile diff must bump `ARG IMAGE_VERSION` — otherwise the change
   would merge to `main` but never be published (`publish.yml`'s release gate only fires on
   a version-bump diff). See `docs/build-and-publish.md` §4.2 and §9.
2. `docker build --platform linux/amd64` succeeds — catches Dockerfile errors and
   `apt-get install` failures. No push.

---

## Coverage Requirements

| Area | Requirement | Notes |
|------|-------------|-------|
| Image version correctness | 100% | Check 1 (`docker inspect` ENV) |
| NordVPN client version | 100% | Check 2 (`nordvpn --version`) |
| Kill switch | 100% | Check 3 (iptables OUTPUT DROP) |
| Daemon startup | 100% | Check 4 (nordvpnd socket) |
| New cont-init.d scripts | Smoke test | Verify the script exits cleanly; add to verify.sh if critical |

---

## Test Conventions

### What to Test

- ✅ Behavior (what the feature does)
- ✅ Critical paths (kill switch, version correctness, daemon startup)
- ✅ Error states (daemon failures, missing capabilities)
- ❌ Implementation details (private variable state, intermediate shell vars)

---

## Validation Gate

See `.ai/workflows/definition-of-done.md` for the full validation gates and Done checklist.

### Before `task release` (required):
```bash
task docker-build                                # Must complete without errors
task verify                                      # All 4 checks must pass (3 pass + 1 warn on Windows is normal)
task verify-live TOKEN_FILE=/path/to/token       # Real NordLynx egress must confirm Spain exit
```

### HEALTHCHECK (runtime)

The Dockerfile includes:
```
HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3
    CMD nordvpn status | grep -q "Status: Connected" || exit 1
```

This surfaces real tunnel state to the Docker engine and Unraid dashboard:
- `starting` — within the first 45s (start-period)
- `healthy` — `nordvpn status` confirms `Status: Connected`
- `unhealthy` — three consecutive failures after start-period

With NordLynx, the container typically transitions `starting → healthy` in ~5s. The HEALTHCHECK does not replace `task verify-live` — it's a runtime signal, not a release gate.

---

## Troubleshooting Common Test Failures

### Check 1 fails (IMAGE_VERSION wrong)
The image was not built with `task docker-build`. Rebuild with `task docker-build`.

### Check 2 fails (`nordvpn --version` reports wrong version)
Stale Docker layer cache. Run:
```bash
docker build --no-cache --platform linux/amd64 . -f Dockerfile -t "fredplex/nordvpn:$(git log --format='%h' -n 1)"
```

### Check 3 fails (iptables policy not DROP)
`NET_ADMIN` capability is required. Ensure Docker Desktop is running and not blocked by a security policy. Test manually:
```bash
docker run --rm --cap-add=NET_ADMIN --cap-add=NET_RAW fredplex/nordvpn:<hash> \
  /bin/bash -c "update-alternatives --set iptables /usr/sbin/iptables-legacy; iptables -L"
```

### Check 4 fails (nordvpnd socket not found)
The daemon failed to start. Check for a broken `cont-init.d` script that halted init before services started, or `/dev/net/tun` not available (check `10-tun` script).
