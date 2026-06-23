# Testing

Testing strategy, validation gates, and coverage expectations for **fredplex/nordvpn**.

**Working copy**: `.ai/workflows/validation.md`

---

## Testing Philosophy

This project has no traditional unit tests — it consists of shell scripts and a Dockerfile. Testing is done by building the image and running smoke checks against it. The goal is to catch the critical paths: wrong NordVPN version installed, kill switch broken, daemon not starting.

- Tests verify behavior (what the container does), not implementation details
- All 4 smoke checks must pass before `task release`
- Static validation is running `task docker-build` cleanly; runtime validation is `task verify`

---

## Test Types

### Smoke Tests (`task verify`)

**Script**: `scripts/verify.sh`
**Run**: `task verify`
**When to run**: After every `task docker-build`; required before `task release`

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
    NordVPN target: 4.5.0

--- Stateless checks ---
  PASS  IMAGE_VERSION env = <hash>
  PASS  nordvpn --version = 4.5.0
  PASS  iptables OUTPUT policy DROP (kill-switch functional)

--- Runtime check (daemon socket) ---
  PASS  nordvpnd socket present at /run/nordvpn/nordvpnd.sock

=== 4 passed | 0 failed | 0 warnings ===
```

### Build Validation (CI)

**Workflow**: `.github/workflows/build-validate.yml`
**Trigger**: PR → main
**What it checks**: `docker build --platform linux/amd64` succeeds — catches Dockerfile errors and `apt-get install` failures. No push.

---

## CI/CD

- **Pipeline**: GitHub Actions
- **PR gate**: `build-validate.yml` — `docker build` only, no credentials, no push
- **Publish gate**: `publish.yml` — triggered by tag push (only after human runs `task release`)
- **No static lint gate** — this is a shell/Docker project; no ESLint, TypeScript, or npm involved

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

---

## Validation Gate

### Before `task release` (required):
```bash
task docker-build    # Must complete without errors
task verify          # All 4 checks must pass
```

See `.ai/workflows/validation.md` for the full validation spec.
